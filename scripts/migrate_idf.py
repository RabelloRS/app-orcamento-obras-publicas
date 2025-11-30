import os
import sys
import django
import re

# Setup Django environment
sys.path.append('/var/www/resolve_django')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'setup.settings')
django.setup()

from ferramenta_drenagem.models import RainEquation
from banco_idf.models import IDFFormula

# Map of states
STATES_MAP = {
    'AC': 'AC', 'AL': 'AL', 'AP': 'AP', 'AM': 'AM', 'BA': 'BA', 'CE': 'CE', 'DF': 'DF',
    'ES': 'ES', 'GO': 'GO', 'MA': 'MA', 'MT': 'MT', 'MS': 'MS', 'MG': 'MG', 'PA': 'PA',
    'PB': 'PB', 'PR': 'PR', 'PE': 'PE', 'PI': 'PI', 'RJ': 'RJ', 'RN': 'RN', 'RS': 'RS',
    'RO': 'RO', 'RR': 'RR', 'SC': 'SC', 'SP': 'SP', 'SE': 'SE', 'TO': 'TO'
}

def extract_state(name):
    # Try to find pattern like "City - UF" or "City/UF" or "City (UF)"
    match = re.search(r'[\s\-\/]([A-Z]{2})[\s\)]*$', name.upper())
    if match:
        state = match.group(1)
        if state in STATES_MAP:
            return state
    
    # Try to find state in the string
    for uf in STATES_MAP:
        if f" {uf} " in f" {name.upper()} " or name.upper().endswith(f" {uf}"):
            return uf
            
    return None

def run():
    print("Iniciando migração de RainEquation para IDFFormula...")
    
    equations = RainEquation.objects.all()
    count = 0
    skipped = 0
    
    # Hardcoded data that was in data.js (to ensure they exist)
    hardcoded_data = [
        {"name": "Curitiba - PR (Fendrich, 1984)", "city": "Curitiba", "state": "PR", "k": 3221.07, "a": 0.258, "b": 26, "c": 1.01},
        {"name": "São Paulo - SP (DAEE/USP)", "city": "São Paulo", "state": "SP", "k": 3462.7, "a": 0.172, "b": 22, "c": 1.025},
        {"name": "Brasília - DF (ADASA)", "city": "Brasília", "state": "DF", "k": 1574.7, "a": 0.207, "b": 11, "c": 0.884},
        {"name": "Aracaju - SE (Aragão)", "city": "Aracaju", "state": "SE", "k": 2084.8, "a": 0.188, "b": 10.52, "c": 0.753},
        {"name": "Belo Horizonte - MG (Ramos, 1995)", "city": "Belo Horizonte", "state": "MG", "k": 5802, "a": 0.15, "b": 30, "c": 1.08},
        {"name": "Rio de Janeiro - RJ (Prefeitura)", "city": "Rio de Janeiro", "state": "RJ", "k": 1400, "a": 0.2, "b": 20, "c": 0.8}
    ]

    for data in hardcoded_data:
        if not IDFFormula.objects.filter(city=data['city'], state=data['state']).exists():
            IDFFormula.objects.create(
                name=data['name'],
                city=data['city'],
                state=data['state'],
                k=data['k'],
                a=data['a'],
                b=data['b'],
                c=data['c'],
                source="Dados Padrão (Migração)",
                is_active=True
            )
            print(f"Criado (Hardcoded): {data['name']}")
            count += 1

    for eq in equations:
        # Clean name
        raw_name = eq.name.strip()
        
        # Try to extract state
        state = extract_state(raw_name)
        
        # Try to extract city (everything before the state or hyphen)
        city = raw_name
        if state:
            # Remove state from name to get city
            city = re.sub(r'[\s\-\/]*' + state + r'[\s\)]*$', '', city, flags=re.IGNORECASE).strip()
            city = re.sub(r'[\s\-\/]*$', '', city).strip()
        else:
            # Default state if unknown
            state = 'SP' # Fallback or skip? Let's put in a "Unknown" bucket or SP/RS as default?
            # Better to log and maybe use a generic one
            # But wait, RainEquation usually has format "City - UF"
            # If we can't find it, we skip or force one.
            # Let's try to be smart.
            pass
            
        if not state:
            state = 'RS' # Assuming local context (Nova Petrópolis developer)
            
        # Check if already exists to avoid duplicates
        if IDFFormula.objects.filter(k=eq.k, a=eq.a, b=eq.b, c=eq.c).exists():
            # print(f"Skipping duplicate: {raw_name}")
            skipped += 1
            continue
            
        IDFFormula.objects.create(
            name=raw_name,
            city=city,
            state=state,
            k=eq.k,
            a=eq.a,
            b=eq.b,
            c=eq.c,
            source="Importado de RainEquation",
            is_active=True
        )
        count += 1
        
    print(f"Migração concluída. {count} fórmulas criadas. {skipped} duplicatas puladas.")

if __name__ == '__main__':
    run()
