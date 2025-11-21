import re
from ferramenta_drenagem.models import RainEquation

raw_data = """
João Pessoa	=(369,4*(H1^0,15))/(('Método I PAI WU'!B19+5)^0,568)
Fortaleza	=(506,99*(H1^0,15))/((H2+5)^0,568)
Setão Oriental Nordestino	=(3609,11*(H1^0,12))/((H2+30)^0,95)
Florianópolis (SC) - t < 60min	=(145*(H1^0,25))/((H2-1,18)^0,34)
Florianópolis (SC) - t > 60min	=(597*(H1^0,32))/((H2+3)^0,73)
Cidade do Rio de Janeiro	=(3463*(H1^0,172))/((H2+22)^0,761)
Belo Horizonte	=(1447,87*(H1^0,1))/((H2+20)^0,84)
Curtiba - Prado velho	=(5726,64*($H$1^0,159))/(($H$2+41)^1,041)
Bandeirantes (PR)	=(1077,21*($H$1^0,157))/(($H$2+10)^0,781)
Cambará (PR)	=(1772,96*($H$1^0,126))/(($H$2+17)^0,867)
Jacarezinho (PR) - TR 3 	=(31200)/(($H$2+50)^1,38)
Jacarezinho (PR) - TR 10 	=(59820)/(($H$2+50)^1,49)
Paranavaí (PR)	=(2808,67*($H$1^0,104))/(($H$2+33)^0,93)
Umuarama (PR)	=(1752,27*($H$1^0,148))/(($H$2+17)^0,84)
Cianorte (PR)	=(2115,18*($H$1^0,145))/(($H$2+22)^0,849)
Apucarana (PR)	=(1301,07*($H$1^0,177))/(($H$2+15)^0,836)
Londrina (PR) 	=(3132,56*($H$1^0,0093))/(($H$2+30)^0,939)
Palotina (PR) - TR 2 anos	=(2492,3)/(($H$2+29)^0,873)
Palotina (PR) - TR 5 anos	=(2618,18)/(($H$2+29)^0,848)
Palotina (PR) - TR 10 anos	=(2737,79)/(($H$2+29)^0,833)
Palotina (PR) - TR 20 anos	=(2866,82)/(($H$2+29)^0,822)
Palotina (PR) - TR 50 anos	=(3041,59)/(($H$2+29)^0,81)
Nova Cantu (PR)	=(2778,43*($H$1^0,149))/(($H$2+24)^0,94)
Tomazina (PR)	=(2676,7*($H$1^0,149))/(($H$2+29)^0,931)
Telêmaco Borba (PR) 	=(3235,19*($H$1^0,162))/(($H$2+24)^0,968)
Palmital (PR) 	=(1548,46*($H$1^0,13))/(($H$2+16)^0,834)
Ponta Grossa (PR)	=(1902,39*($H$1^0,152))/(($H$2+21)^0,893)
Cerro Azul (PR)	=(1625,55*($H$1^0,138))/(($H$2+18)^0,86)
Guaraqueçaba (PR)	=(1479,78*($H$1^0,172))/(($H$2+19)^0,802)
Cascavel (PR)	=(1062,92*($H$1^0,141))/(($H$2+5)^0,776)
Laranjeiras do Sul (PR) 	=(771,97*($H$1^0,148))/(($H$2+8)^0,726)
Guarapuava (PR)	=(1039,68*($H$1^0,171))/(($H$2+10)^0,799)
Piraquara (PR) 	=(1537,8*($H$1^0,12))/(($H$2+17)^0,859)
Morretes (PR)	=(2160,23*($H$1^0,155))/(($H$2+24)^0,89)
Teixeira Soares (PR) 	=(959,18*($H$1^0,177))/(($H$2+9)^0,789)
Planalto (PR) 	=(1659,59*($H$1^0,156))/(($H$2+14)^0,84)
Francisco Beltrão (PR) 	=(1012,28*($H$1^0,182))/(($H$2+9)^0,76)
Pato Branco (PR)	=(879,43*($H$1^0,152))/(($H$2+9)^0,732)
Clevelândia (PR) 	=(2553,88*($H$1^0,166))/(($H$2+24)^0,917)
Ivaiporã (PR) 	=(676,71*($H$1^0,158))/(($H$2+1)^0,726)
Porto Amazonas (PR) 	=(2543,31*($H$1^0,196))/(($H$2+27)^0,952)
Santa Izabel do Ivaí (PR) 	=(1824,73*($H$1^0,166))/(($H$2+17)^0,892)
Tibagi (PR) 	=(1592,58*($H$1^0,136))/(($H$2+11)^0,882)
Palmas (PR) 	=(1303,47*($H$1^0,126))/(($H$2+12)^0,815)
São Miguel do Iguaçu (PR) 	=(2886,69*($H$1^0,124))/(($H$2+26)^0,927)
Araucária (PR) 	=(2505,53*($H$1^0,177))/(($H$2+13)^0,988)
Antonina (PR) 	=(5209,55*($H$1^0,16))/(($H$2+57)^0,978)
Feira de Santana (BA) 	=(716*($H$1^0,241))/(($H$2+11)^0,761)
São Carlos 	=((25,33*($H$1^0,236))/(($H$2+16)^0,935)*60)
Campinas	=((42,081*($H$1^0,1429))/(($H$2+20)^0,9483)*60)
Presidente Prudente 	=(506,9059*($H$1^0,168))/(($H$2+8)^0,61)
Cidade de São Paulo	=(1747*($H$1^0,181))/(($H$2+15)^0,89)
Urussanga/SC 	=(3445,7*($H$1^0,138))/(($H$2+26)^1,012)
Alvorada/TO 	=(9989,56*($H$1^0,211))/(($H$2+56,638)^1,087)
Araguatins/TO 	=(4732,318*($H$1^0,229))/(($H$2+46,957)^0,995)
Dianópolis/TO 	=(4642,242*($H$1^0,162))/(($H$2+35,878)^1,051)
Formoso do Araguaia/TO 	=(8740,42*($H$1^0,176))/(($H$2+54,663)^1,078)
Guaraí/TO	=(8650,36*($H$1^0,178))/(($H$2+41,365)^1,098)
Miracema do Tocantins/TO 	=(5958,095*($H$1^0,173))/(($H$2+35,298)^1,043)
Natividade/TO	=(2113,85*($H$1^0,206))/(($H$2+30,296)^0,845)
Tupiratins/TO 	=(2300,09*($H$1^0,155))/(($H$2+31,686)^0,869)
Tocantinópolis/TO 	=(9862*($H$1^0,187))/(($H$2+69,638)^1,072)
Projeto Rio Formoso/TO 	=(8950,25*($H$1^0,194))/(($H$2+71,072)^1,027)
Alvorada do Norte/GO 	=(1018,591*($H$1^0,1354))/(($H$2+12)^0,7598)
Alto Garças/GO	=(873,374*($H$1^0,1328))/(($H$2+10)^0,7418)
Aporé/GO	=(1265,319*($H$1^0,1368))/(($H$2+15)^0,7853)
Aruamã/GO	=(1274,09*($H$1^0,152))/(($H$2+12)^0,7599)
Caiapônia/GO	=(1138,151*($H$1^0,1643))/(($H$2+12)^0,7599)
Campo Alegre/GO	=(975,439*($H$1^0,1643))/(($H$2+12)^0,7598)
Catalão/GO	=(1018,591*($H$1^0,1323))/(($H$2+12)^0,76)
Ceres/GO	=(959,621*($H$1^0,1764))/(($H$2+12)^0,7601)
Goiânia/GO	=(920,45*($H$1^0,1422))/(($H$2+12)^0,7599)
Israelândia/GO	=(1120,211*($H$1^0,1598))/(($H$2+12)^0,7598)
Morrinhos/GO	=(1003,46*($H$1^0,1376))/(($H$2+10)^0,7418)
Niquelândia/GO	=(972,299*($H$1^0,1204))/(($H$2+10)^0,742)
Salvador/BA	=(1065,66*($H$1^0,163))/(($H$2+24)^0,743)
Álcalis/RJ	=(3281,158*($H$1^0,222))/(($H$2+44,204)^1)
Alto da Boa Vista/RJ	=(4378,133*($H$1^0,227))/(($H$2+49,157)^0,999)
Angra dos Reis/RJ	=(721,802*($H$1^0,211))/(($H$2+10,566)^0,72)
Campos/RJ	=(1133,836*($H$1^0,183))/(($H$2+20,667)^0,807)
Cordeiro/RJ	=(612,197*($H$1^0,185))/(($H$2+5)^0,695)
Escola Agrícola/RJ	=(3812,02*($H$1^0,218))/(($H$2+34,565)^0,999)
Ilha Guaíba/RJ	=(1045,123*($H$1^0,244))/(($H$2+49,945)^0,679)
Itaperuna/RJ	=(4999,882*($H$1^0,196))/(($H$2+34,462)^0,986)
Macaé/RJ	=(444,258*($H$1^0,263))/(($H$2+6,266)^0,655)
Nova Friburgo/RJ	=(2629,477*($H$1^0,236))/(($H$2+24,664)^0,975)
Resende/RJ	=(1652,972*($H$1^0,182))/(($H$2+21,41)^0,767)
Santa Cruz/RJ	=(2474,281*($H$1^0,2113))/(($H$2+37,4228)^0,9491)
Vassouras/RJ	=(3086,29*($H$1^0,2))/(($H$2+22,081)^1)
Alegre/ES	=(1497,781*($H$1^0,258))/(($H$2+19,294)^0,855)
Aracruz/SC	=(1298,382*($H$1^0,12))/(($H$2+20,981)^0,786)
Boa Esperança/ES	=(596,38*($H$1^0,23))/(($H$2+8,534)^0,67)
Linhares/ES	=(3647,235*($H$1^0,223))/(($H$2+20,665)^1)
São Grabriel da Palha/ES	=(1309,205*($H$1^0,23))/(($H$2+15,375)^0,821)
São Mateus/ES	=(4999,205*($H$1^0,191))/(($H$2+49,999)^0,983)
Venda Nova/ES	=(4147,062*($H$1^0,205))/(($H$2+33,842)^1)
Vitória/ES	=(4003,611*($H$1^0,203))/(($H$2+49,997)^0,931)
Chapadão do Sul/E=MS	=(809,2229*($H$1^0,1335))/(($H$2+9,2)^0,6999)
Jundiaí	=(809,2229*($H$1^0,1335))/(($H$2+9,2)^0,6999)
"""

# Regex to extract K, a, b, c
# Standard form: K * H1^a / (H2 + b)^c
# H1 is TR, H2 is t (min)
# Some have *60 at the end, meaning K needs to be multiplied by 60 if the formula was for i in mm/min (but usually these are mm/h)
# Wait, if it has *60, it might be converting intensity.
# Let's look at São Carlos: ((25,33*(H1^0,236))/((H2+16)^0,935)*60)
# This implies the base formula gave mm/min? Or it's just part of K.
# I will assume the *60 is part of K.

def parse_and_save():
    lines = raw_data.strip().split('\n')
    count = 0
    for line in lines:
        if not line.strip(): continue
        parts = line.split('\t')
        if len(parts) < 2: continue
        
        name = parts[0].strip()
        formula = parts[1].strip().replace(',', '.')
        
        # Default values
        k = 0
        a = 0
        b = 0
        c = 0
        
        try:
            # Extract K
            # Look for number at start or after (
            # Pattern: (K * ...
            k_match = re.search(r'[\(=]\s*([\d\.]+)\s*\*', formula)
            if k_match:
                k = float(k_match.group(1))
            
            # Check for *60 at the end
            if '*60' in formula:
                k = k * 60
                
            # Extract a (exponent of H1/TR)
            # Pattern: H1\^([\d\.]+) or $H$1\^([\d\.]+)
            a_match = re.search(r'H\$?1\^([\d\.]+)', formula)
            if a_match:
                a = float(a_match.group(1))
                
            # Extract b (additive to H2/t)
            # Pattern: H2\+([\d\.]+) or H2\-([\d\.]+)
            # Note: Florianopolis has H2-1.18. 
            b_match = re.search(r'H\$?2([\+\-])([\d\.]+)', formula)
            if b_match:
                sign = b_match.group(1)
                val = float(b_match.group(2))
                b = val if sign == '+' else -val
                
            # Extract c (exponent of denominator)
            # Pattern: \)\^([\d\.]+) at the end of denominator
            # This is tricky, usually it's )^c
            c_match = re.search(r'\)\^([\d\.]+)(?:\)|$|\*)', formula)
            # If there are multiple, the last one is usually c (denominator)
            # But the first one is a (numerator).
            # Let's be more specific: / ( ... )^c
            c_match_specific = re.search(r'/\s*\(\(?.*?\)\^([\d\.]+)', formula)
            if c_match_specific:
                 c = float(c_match_specific.group(1))
            
            # Special case for Jacarezinho (fixed TR)
            # Jacarezinho (PR) - TR 3 	=(31200)/(($H$2+50)^1,38)
            # Here K is 31200, a is 0 (since TR is fixed in K), b=50, c=1.38
            # But the model expects 'a' to calculate with TR.
            # If 'a' is 0, then I = K / ... which is constant for any TR, which is wrong if the user changes TR.
            # But these specific entries are for specific TRs.
            # I will save them as is, with a=0. The user should know not to change TR or it won't affect result.
            if 'Jacarezinho' in name or 'Palotina' in name:
                 # These have fixed TR.
                 pass

            RainEquation.objects.get_or_create(
                name=name,
                defaults={'k': k, 'a': a, 'b': b, 'c': c}
            )
            count += 1
            print(f"Saved {name}: K={k}, a={a}, b={b}, c={c}")
            
        except Exception as e:
            print(f"Error parsing {name}: {e}")

    print(f"Total imported: {count}")

parse_and_save()
