import requests
import json

base_url = "http://127.0.0.1:8000/api"

# Login
login_res = requests.post(
    f"{base_url}/auth/login",
    json={"email": "valid@example.com", "password": "password"}
)
print("Login:", login_res.json())

token = login_res.json()["data"]["access_token"]

# Upload
with open("dummy.txt", "w") as f:
    f.write("dummy image content")

upload_res = requests.post(
    f"{base_url}/users/me/photo",
    headers={"Authorization": f"Bearer {token}"},
    files={"photo": ("dummy.jpg", open("dummy.txt", "rb"), "image/jpeg")}
)
print("Upload:", upload_res.status_code, upload_res.json())
