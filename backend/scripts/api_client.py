import requests
import json
import os

BASE_URL = "http://localhost:8000/api"

class APIClient:
    def __init__(self):
        self.session = requests.Session()
        self.token = None

    def login(self, email, password):
        print(f"Logging in as {email}...")
        resp = self.session.post(
            f"{BASE_URL}/auth/token",
            data={"username": email, "password": password}
        )
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print("Login successful!")
            return True
        else:
            print("Login failed!", resp.text)
            return False

    def get(self, endpoint, **kwargs):
        return self.session.get(f"{BASE_URL}{endpoint}", **kwargs)

    def post(self, endpoint, **kwargs):
        return self.session.post(f"{BASE_URL}{endpoint}", **kwargs)

    def patch(self, endpoint, **kwargs):
        return self.session.patch(f"{BASE_URL}{endpoint}", **kwargs)

    def put(self, endpoint, **kwargs):
        return self.session.put(f"{BASE_URL}{endpoint}", **kwargs)

    def delete(self, endpoint, **kwargs):
        return self.session.delete(f"{BASE_URL}{endpoint}", **kwargs)

client = APIClient()
