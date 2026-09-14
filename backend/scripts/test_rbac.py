import requests

base_url = "http://127.0.0.1:8000/api"

# 1. Login as SuperAdmin
login_data = {
    "email": "admin@example.com",
    "password": "supersecret123"
}

print("Logging in as SuperAdmin...")
login_res = requests.post(f"{base_url}/auth/login", json=login_data)
if login_res.status_code != 200:
    print("Login failed!", login_res.text)
    exit(1)
    
token = login_res.json()["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login successful.")

# 2. Test /api/auth/me
print("\nTesting GET /api/auth/me...")
me_res = requests.get(f"{base_url}/auth/me", headers=headers)
print("Response:", me_res.status_code, me_res.json())

# 3. Test /api/roles/permission-matrix
print("\nTesting GET /api/roles/permission-matrix...")
matrix_res = requests.get(f"{base_url}/roles/permission-matrix", headers=headers)
print("Response:", matrix_res.status_code, matrix_res.json())

# 4. Test /api/admin/students
print("\nTesting GET /api/admin/students...")
students_res = requests.get(f"{base_url}/admin/students", headers=headers)
print("Response:", students_res.status_code, students_res.json())
