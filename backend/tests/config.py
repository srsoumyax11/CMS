import random
import string
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
STUDENT_EMAIL = f"teststudent_{random_suffix}@example.com"
FACULTY_EMAIL = f"testfaculty_{random_suffix}@example.com"
STUDENT_PASSWORD = "Securepassword123!"
FACULTY_PASSWORD = "Facultypassword123!"
SUPERADMIN_EMAIL = "superadmin@cms.com"
SUPERADMIN_PASSWORD = "Super+Admin@123"
BASE_URL = "http://127.0.0.1:8000/api"
def print_step(msg):
    print(f"\n[{'='*10} {msg} {'='*10}]")
