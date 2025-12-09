import requests
import os
from datetime import datetime

class SicroDownloader:
    BASE_URL = "https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro"
    
    STATES = {
        "AC": ("norte", "acre"), "AL": ("nordeste", "alagoas"), "AP": ("norte", "amapa"),
        "AM": ("norte", "amazonas"), "BA": ("nordeste", "bahia"), "CE": ("nordeste", "ceara"),
        "DF": ("centro-oeste", "distrito-federal"), "ES": ("sudeste", "espirito-santo"),
        "GO": ("centro-oeste", "goias"), "MA": ("nordeste", "maranhao"), "MT": ("centro-oeste", "mato-grosso"),
        "MS": ("centro-oeste", "mato-grosso-do-sul"), "MG": ("sudeste", "minas-gerais"),
        "PA": ("norte", "para"), "PB": ("nordeste", "paraiba"), "PR": ("sul", "parana"),
        "PE": ("nordeste", "pernambuco"), "PI": ("nordeste", "piaui"), "RJ": ("sudeste", "rio-de-janeiro"),
        "RN": ("nordeste", "rio-grande-do-norte"), "RS": ("sul", "rio-grande-do-sul"),
        "RO": ("norte", "rondonia"), "RR": ("norte", "roraima"), "SC": ("sul", "santa-catarina"),
        "SP": ("sudeste", "sao-paulo"), "SE": ("nordeste", "sergipe"), "TO": ("norte", "tocantins")
    }
    
    MONTHS = {
        1: "janeiro", 2: "fevereiro", 3: "marco", 4: "abril", 5: "maio", 6: "junho",
        7: "julho", 8: "agosto", 9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"
    }

    def download(self, state: str, month: int, year: int, output_dir: str = "storage/imports"):
        state = state.upper()
        if state not in self.STATES:
            raise ValueError(f"Invalid state: {state}")
            
        region, state_slug = self.STATES[state]
        month_name = self.MONTHS[month]
        
        # Base Path
        base_path = f"{self.BASE_URL}/{region}/{state_slug}/{year}/{month_name}"
        
        # Try filename patterns
        # Pattern 1: rs-07-2025.7z
        f1 = f"{state.lower()}-{month:02d}-{year}.7z"
        # Pattern 2: julho-2025.zip (Common in other states)
        f2 = f"{month_name}-{year}.zip"
        # Pattern 3: julho-2025.7z
        f3 = f"{month_name}-{year}.7z"
        # Pattern 4: With 'revisado' (hard to guess, assume standard first)
        
        candidates = [f1, f2, f3]
        
        for fname in candidates:
            url = f"{base_path}/{fname}"
            print(f"Trying {url}...")
            try:
                r = requests.get(url, stream=True, timeout=10)
                if r.status_code == 200:
                    print(f"Found! Downloading {fname}...")
                    os.makedirs(output_dir, exist_ok=True)
                    local_path = os.path.join(output_dir, f"SICRO_{state}_{year}_{month:02d}{os.path.splitext(fname)[1]}")
                    with open(local_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                    print(f"Saved to {local_path}")
                    return local_path
            except Exception as e:
                print(f"Error checking {url}: {e}")
        
        raise FileNotFoundError(f"Could not find SICRO file for {state}/{month}/{year}")

if __name__ == "__main__":
    import sys
    # Usage: python sicro_downloader.py SP 7 2025
    if len(sys.argv) < 4:
        print("Usage: SicroDownloader.py STATE MONTH YEAR")
    else:
        dl = SicroDownloader()
        dl.download(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
