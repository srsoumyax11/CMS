import requests

base_url = "http://127.0.0.1:8000/api"

# 1. Fetch available courses and branches
print("Fetching courses...")
courses_res = requests.get(f"{base_url}/metadata/courses")
courses_data = courses_res.json()
print("Courses:", courses_data)

if not courses_data.get("success") or not courses_data.get("data"):
    print("No courses found. Run seed_academic.py first.")
    exit(1)

# Pick the first course (e.g. B.Tech) and its first branch (e.g. CSE)
btech = courses_data["data"][0]
course_id = btech["id"]
branch_id = btech["branches"][0]["id"]

print(f"Selected Course: {btech['name']} ({course_id})")
print(f"Selected Branch: {btech['branches'][0]['name']} ({branch_id})")

# 2. Register
register_data = {
    "email": "teststudent2@example.com",
    "password": "password123",
    "name": "Test Student",
    "course_id": course_id,
    "branch_id": branch_id,
    "year": 2024
}

print("\nRegistering student...")
register_res = requests.post(f"{base_url}/auth/register", json=register_data)
print("Register Status:", register_res.status_code)
print("Register Response:", register_res.json())

# 3. Login
login_data = {
    "email": "teststudent2@example.com",
    "password": "password123"
}

print("\nLogging in...")
login_res = requests.post(f"{base_url}/auth/login", json=login_data)
print("Login Status:", login_res.status_code)
print("Login Response:", login_res.json())
