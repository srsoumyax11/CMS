"""
Department Seeding Data Definitions
Contains comprehensive list of Academic and Administrative Departments for BPUT CMS.
"""

ACADEMIC_DEPARTMENTS = [
    {
        "code": "CSE",
        "name": "Computer Science & Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "ECE",
        "name": "Electronics & Communication Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "EE",
        "name": "Electrical Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "ME",
        "name": "Mechanical Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "CE",
        "name": "Civil Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "CHE",
        "name": "Chemical Engineering",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "IT",
        "name": "Information Technology",
        "department_type": "academic",
        "is_active": True,
    },
    {
        "code": "BSH",
        "name": "Basic Sciences & Humanities",
        "department_type": "academic",
        "is_active": True,
    },
]

ADMINISTRATIVE_DEPARTMENTS = [
    {
        "code": "SEC",
        "name": "Campus Security & Vigilance",
        "department_type": "administrative",
        "is_active": True,
    },
    {
        "code": "ACC",
        "name": "Accounts & Finance Division",
        "department_type": "administrative",
        "is_active": True,
    },
    {
        "code": "MGT",
        "name": "Executive Management & Governance",
        "department_type": "administrative",
        "is_active": True,
    },
    {
        "code": "ADM",
        "name": "General Administration & HR",
        "department_type": "administrative",
        "is_active": True,
    },
    {
        "code": "EXM",
        "name": "Examination & Evaluation Cell",
        "department_type": "administrative",
        "is_active": True,
    },
    {
        "code": "LIB",
        "name": "Central Library Services",
        "department_type": "administrative",
        "is_active": True,
    },
]

ALL_DEPARTMENTS = ACADEMIC_DEPARTMENTS + ADMINISTRATIVE_DEPARTMENTS
