import requests
import uuid
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_flow():
    # 1. Get Settings
    print("Testing GET /metadata/settings/public...")
    res = requests.get(f"{BASE_URL}/metadata/settings/public")
    print(res.status_code, res.json())

    # 2. Get Departments
    print("Testing GET /metadata/departments...")
    res = requests.get(f"{BASE_URL}/metadata/departments")
    print(res.status_code, len(res.json().get('data', [])))
    dept_id = None
    if res.json().get('data'):
        dept_id = res.json()['data'][0]['id']

    # 3. Get Courses
    print("Testing GET /metadata/courses...")
    res = requests.get(f"{BASE_URL}/metadata/courses")
    print(res.status_code, len(res.json().get('data', [])))
    course_id = None
    if res.json().get('data'):
        course_id = res.json()['data'][0]['id']

    # 4. Register User
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    print(f"Registering user {test_email}...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Test Student",
        "email": test_email,
        "password": "Password123!"
    })
    print(res.status_code, res.json())
    
    # 5. Login
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": test_email,
        "password": "Password123!"
    })
    print(res.status_code)
    token = res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # 6. Create Profile
    if course_id and dept_id:
        print("Creating student profile...")
        res = requests.post(f"{BASE_URL}/users/me/student-profile", json={
            "course_id": course_id,
            "department_id": dept_id,
            "year": 1,
            "hostel": "A"
        }, headers=headers)
        print(res.status_code, res.json())

        print("Fetching student profile...")
        res = requests.get(f"{BASE_URL}/users/me/student-profile", headers=headers)
        print(res.status_code, res.json())

if __name__ == "__main__":
    time.sleep(2)  # Wait for server just in case
    test_flow()
