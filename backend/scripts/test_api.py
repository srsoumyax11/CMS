import requests
import json

response = requests.post(
    "http://127.0.0.1:8000/api/auth/register",
    json={
        "email": "valid@example.com",
        "password": "password",
        "name": "User Valid",
        "course": "B.Tech",
        "branch": "CSE",
        "year": 2024,
        "photo_url": "google.com"
    }
)
print("Valid Request:", response.status_code, response.json())

response_invalid = requests.post(
    "http://127.0.0.1:8000/api/auth/register",
    json={
        "email": "invalid@example.com",
        "password": "password",
        "name": "User Invalid",
        "course": "BIKI",
        "branch": "CDS",
        "year": 202222,
        "photo_url": "google.com"
    }
)
print("Invalid Request:", response_invalid.status_code, response_invalid.json())
