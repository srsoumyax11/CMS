from scripts.api_client import client
import os

def get_current_profile():
    resp = client.get("/auth/me")
    if resp.status_code == 200:
        return resp.json().get("data", {})
    return None

def update_profile_info():
    print("\n--- Automated Profile Test ---")
    profile = get_current_profile()
    if not profile:
        print("Failed to get profile.")
        return
        
    original_name = profile.get('name')
    test_name = "Test Admin Name"
    print(f"\nCurrent is: {original_name}")
    print(f"Changing to: {test_name}")
    
    # 1. Change to test name
    resp = client.patch("/users/me/name", json={"name": test_name})
    if resp.status_code == 200:
        print("Success")
    else:
        print("Failed to update profile name:", resp.text)
        return
        
    # 2. Revert back
    print(f"Reverting back to: {original_name}")
    resp = client.patch("/users/me/name", json={"name": original_name})
    if resp.status_code == 200:
        print("Successfully tested those end points")
    else:
        print("Failed to revert profile name:", resp.text)

def update_profile_picture():
    print("\n--- Update Profile Picture ---")
    # Automatically use the img.jpg in the scripts directory
    filepath = os.path.join(os.path.dirname(__file__), "img.jpg")
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    print(f"Uploading {filepath}...")
    with open(filepath, "rb") as f:
        files = {"photo": ("img.jpg", f, "image/jpeg")}
        resp = client.session.post(f"http://localhost:8000/api/users/me/photo", files=files)
        
    if resp.status_code == 200:
        print("Profile picture updated successfully!")
        print(resp.json())
    else:
        print("Failed to upload profile picture:", resp.text)

def menu():
    while True:
        print("\n=== Profile Management ===")
        print("1. Automated Profile Test (Name Update & Revert)")
        print("2. Upload Profile Picture")
        print("0. Back to Main Menu")
        choice = input("Select an option: ")
        
        if choice == '1':
            update_profile_info()
        elif choice == '2':
            update_profile_picture()
        elif choice == '0':
            break
        else:
            print("Invalid choice!")
