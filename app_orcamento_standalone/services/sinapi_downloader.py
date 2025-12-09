import requests
import zipfile
import io
import datetime
from fastapi import HTTPException

# Disable warnings for insecure requests (if we prefer verify=False)
import requests.packages.urllib3
requests.packages.urllib3.disable_warnings()

def download_latest_sinapi(state: str):
    """
    Downloads the latest available SINAPI zip for the given state.
    Returns:
        tuple: (file_content: bytes, filename: str, month: int, year: int)
    """
    today = datetime.date.today()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    # Try last 6 months
    session = requests.Session()
    # Visit main page to set cookies
    try:
        session.get("https://www.caixa.gov.br/site/paginas/downloads.aspx", headers=headers, verify=False, timeout=30)
    except:
        pass # Best effort

    for i in range(6): 
        d = today - datetime.timedelta(days=30 * i)
        year = d.year
        month = d.month
        
        mm = f"{month:02d}"
        
        url = f"https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-{year}-{mm}-formato-xlsx.zip"
        print(f"Trying to download: {url}")
        
        try:
            # enable_redirects=True is default, but explicit here. verify=False to avoid SSL headaches with govt sites.
            response = session.get(url, headers=headers, allow_redirects=True, verify=False, timeout=30)
            
            if response.status_code == 200:
                print(f"Download successful (size: {len(response.content)} bytes). Extracting...")
                
                try:
                    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                        state_upper = state.upper()
                        target_file = None
                        
                        for name in z.namelist():
                            if state_upper in name.upper() and ("XLS" in name.upper() or "XLSX" in name.upper()):
                                 if "COMPOSICOES" in name.upper():
                                     target_file = name
                                     break
                        
                        if target_file:
                            print(f"Found file: {target_file}")
                            return z.read(target_file), target_file, month, year
                        else:
                            print(f"No file for state {state} found in zip (files: {z.namelist()})")
                except zipfile.BadZipFile:
                    print(f"Downloaded content is not a valid zip file. Content preview: {response.content[:100]}")
            elif response.status_code == 429:
                print(f"Failed to download {url}: Rate limit exceeded (429). Server is blocking requests.")
                raise HTTPException(status_code=503, detail="Caixa server is blocking requests (Rate Limit). Please use manual upload.")
            else:
                print(f"Failed to download {url}: Status {response.status_code}")
                # If we get a 200 OK but it's an error page (Caixa does this sometimes)
                        
        except Exception as e:
            print(f"Error downloading {url}: {str(e)}")
            continue
            
    raise HTTPException(status_code=404, detail="Could not find SINAPI file for recent months")
