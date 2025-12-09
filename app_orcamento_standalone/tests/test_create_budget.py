import requests
import datetime

# 1. Login
session = requests.Session()
login_data = {
    "username": "admin@resolve.eng.br",
    "password": "admin123"
}
resp = session.post("http://127.0.0.1:8000/api/v1/auth/token", data=login_data)
if resp.status_code != 200:
    print("Login failed")
    exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Get Project List
print("Fetching projects...")
resp = session.get("http://127.0.0.1:8000/api/v1/projects/", headers=headers)
projects = resp.json().get("items", [])
if not projects:
    print("No projects found. Creating one...")
    p_resp = session.post("http://127.0.0.1:8000/api/v1/projects/", json={"name": "Budget Test Project"}, headers=headers)
    project_id = p_resp.json()["id"]
else:
    project_id = projects[0]["id"]

print(f"Using Project ID: {project_id}")

# 3. Create Budget
print("Creating budget...")
payload = {
    "project_id": project_id,
    "name": "Test Script Budget",
    "reference_date": datetime.date.today().isoformat(),
    "status": "DRAFT"
}

resp = session.post("http://127.0.0.1:8000/api/v1/budgets/", json=payload, headers=headers)
print(f"Create Budget Status: {resp.status_code}")
print(f"Response: {resp.text}")
