from scripts.api_client import client

def create_courses():
    courses = [
        {"name": "B.Tech", "is_active": True},
        {"name": "M.Tech", "is_active": True},
        {"name": "Ph.D", "is_active": True}
    ]
    print("\n--- Creating Courses ---")
    for c in courses:
        resp = client.post("/admin/courses", json=c)
        if resp.status_code == 200:
            print(f"Created Course: {c['name']}")
        else:
            print(f"Failed to create Course {c['name']}:", resp.text)


def create_departments():
    departments = [
        {'name': 'Computer Science and Engineering', 'code': 'CSE', 'department_type': 'academic'},
        {'name': 'Mechanical Engineering', 'code': 'ME', 'department_type': 'academic'},
        {'name': 'Electrical Engineering', 'code': 'EE', 'department_type': 'academic'},
        {'name': 'Civil Engineering', 'code': 'CE', 'department_type': 'academic'},
        {'name': 'Information Technology', 'code': 'IT', 'department_type': 'academic'},
        {'name': 'Electronics and Communication', 'code': 'ECE', 'department_type': 'academic'},
        {'name': 'Chemical Engineering', 'code': 'ChemE', 'department_type': 'academic'},
        {'name': 'Biotechnology', 'code': 'BioTech', 'department_type': 'academic'},
        {'name': 'Administrative', 'code': 'Admin', 'department_type': 'administrative'},
        {'name': 'Accounts', 'code': 'Accounts', 'department_type': 'administrative'},
        {'name': 'Human Resources', 'code': 'HR', 'department_type': 'administrative'},
        {'name': 'Library', 'code': 'Library', 'department_type': 'administrative'},
        {'name': 'Mathematics', 'code': 'Math', 'department_type': 'academic'},
        {'name': 'Physics', 'code': 'Physics', 'department_type': 'academic'},
        {'name': 'Chemistry', 'code': 'Chemistry', 'department_type': 'academic'},
        {'name': 'Humanities', 'code': 'Humanities', 'department_type': 'academic'}
    ]
    print("\n--- Creating Departments ---")
    for d in departments:
        d['is_active'] = True
        resp = client.post("/admin/departments", json=d)
        if resp.status_code == 200:
            print(f"Created Department: {d['name']}")
        else:
            print(f"Failed to create Department {d['name']}:", resp.text)

def menu():
    while True:
        print("\n=== Academic Data Management ===")
        print("1. Seed Initial Courses (B.Tech, M.Tech, Ph.D)")
        print("2. Seed Initial Departments")
        print("0. Back to Main Menu")
        choice = input("Select an option: ")
        
        if choice == '1':
            create_courses()
        elif choice == '2':
            create_departments()
        elif choice == '0':
            break
        else:
            print("Invalid choice!")
