import requests

url = "http://127.0.0.1:8000/api/v1/auth/token"
data = {
    "username": "admin@resolve.eng.br",
    "password": "admin123"
}

try:
    print(f"Sending POST to {url} with {data['username']}...")
    response = requests.post(url, data=data)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Login SUCCESS!")
        print("Token received.")
    else:
        print("Login FAILED!")
        print("Response:", response.text)
except Exception as e:
    print(f"Error: {e}")
