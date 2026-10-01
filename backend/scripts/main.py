import os
import sys

# Ensure backend directory is in sys.path so we can import from app/core if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.api_client import client
from scripts import manage_academic
from scripts import manage_profile
from scripts import seed_users
from scripts import seed_students

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
        
    while True:
        print("\n=== API Automation Script Menu ===")
        print("1. Seed Courses")
        print("2. Test Profile Management")
        print("3. Seed Departments")
        print("4. Seed Faculty & Admin")
        print("5. Seed Fake Students")
        print("6. Exit")
        
        choice = input("What do you want to do? (1-6): ").strip()
        
        if choice == "1":
            manage_academic.create_courses()
        elif choice == "2":
            manage_profile.update_profile_info()
            manage_profile.update_profile_picture()
        elif choice == "3":
            manage_academic.create_departments()
        elif choice == "4":
            seed_users.create_users()
        elif choice == "5":
            count_str = input("How many students to generate? (default: 30): ").strip()
            try:
                count = int(count_str) if count_str else 30
            except ValueError:
                count = 30
            seed_students.create_students(count)
        elif choice == "6" or choice.lower() in ("exit", "q"):
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please enter a number between 1 and 6.")

if __name__ == "__main__":
    main()
