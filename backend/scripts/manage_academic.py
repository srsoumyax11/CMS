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
        # Academic
        {'name': 'Computer Science & Engineering', 'code': 'CSE', 'department_type': 'academic'},
        {'name': 'Mechanical Engineering', 'code': 'ME', 'department_type': 'academic'},
        {'name': 'Electrical & Electronics Engineering', 'code': 'EEE', 'department_type': 'academic'},
        {'name': 'Electrical Engineering', 'code': 'EE', 'department_type': 'academic'},
        {'name': 'Civil Engineering', 'code': 'CE', 'department_type': 'academic'},
        {'name': 'Electronics & Telecommunication Engineering', 'code': 'ETC', 'department_type': 'academic'},
        {'name': 'Basic Science & Humanities', 'code': 'BSH', 'department_type': 'academic'},
        # Administrative
        {'name': 'Main Administrative Office', 'code': 'Admin', 'department_type': 'administrative'},
        {'name': 'Accounts & Finance Section', 'code': 'Accounts', 'department_type': 'administrative'},
        {'name': 'Admissions & Student Welfare Cell', 'code': 'Admissions', 'department_type': 'administrative'},
        {'name': 'Examination Section', 'code': 'Exams', 'department_type': 'administrative'},
        {'name': 'Training & Placement (T&P) Cell', 'code': 'T&P', 'department_type': 'administrative'},
        {'name': 'Central Library & Information Division', 'code': 'Library', 'department_type': 'administrative'},
        {'name': 'Campus Maintenance & Hostel Management', 'code': 'Maintenance', 'department_type': 'administrative'}
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
