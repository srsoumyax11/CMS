import os
import sys

# Ensure backend directory is in sys.path so we can import from app/core if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.api_client import client
from scripts import manage_academic
from scripts import manage_profile

from dotenv import load_dotenv

def authenticate():
    print("=== API Automation Script ===")
    # Load env variables from backend/.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    
    email = os.getenv("SUPERADMIN_EMAIL", "superadmin@cms.com")
    password = os.getenv("SUPERADMIN_PASSWORD", "Super+Admin@123")
    
    print(f"Logging in as {email}...")
    return client.login(email, password)

def main():
    if not authenticate():
        sys.exit(1)
        
    print("\n=== Running All Automated Tests ===")
    
    # 1. Seed Academic Data
    manage_academic.create_courses()
    manage_academic.create_departments()
    
    # 2. Test Profile Management
    manage_profile.update_profile_info()
    manage_profile.update_profile_picture()
    
    print("\n=== All Tests Completed ===")

if __name__ == "__main__":
    main()
