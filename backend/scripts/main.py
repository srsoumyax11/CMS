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
    
    ans = input(f"Logging in as {email}... (Y/n): ").strip().lower()
    if ans == 'n':
        return False
        
    return client.login(email, password)

def main():
    if not authenticate():
        sys.exit(1)
        
    while True:
        print("\n=== Main Menu ===")
        print("1. Academic Data Management (Courses, Departments)")
        print("2. Profile Management (Avatar, Name)")
        print("0. Exit")
        
        choice = input("Select an option: ")
        
        if choice == '1':
            manage_academic.menu()
        elif choice == '2':
            manage_profile.menu()
        elif choice == '0':
            print("Exiting...")
            break
        else:
            print("Invalid choice!")

if __name__ == "__main__":
    main()
