from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import (
    StudentProfile, FacultyProfile, StaffProfile, ParentProfile, AcademicStatus, EmploymentStatus
)
from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
from app.core.security import hash_password

def hash_pw(pw: str) -> str:
    return hash_password(pw)

async def seed_users(db: AsyncSession, roles_dict: dict, dept_dict: dict, course_dict: dict, rooms_list: list):
    print("📌 Seeding Users (Admins, Faculty, Staff, Students, Parents)...")

    # Admins
    admins_data = [
        ("superadmin@cms.com", "Super Admin", "admin", UserType.admin),
        ("admin@cms.com", "Campus Administrator", "admin", UserType.admin),
    ]
    for email, name, role_k, u_type in admins_data:
        res = await db.execute(select(User).where(User.email == email))
        u = res.scalars().first()
        if not u:
            u = User(
                email=email,
                hashed_password=hash_pw("Admin@123" if "super" not in email else "Super+Admin@123"),
                name=name,
                user_type=u_type,
                account_status=AccountStatus.active,
                role_id=roles_dict[role_k].id
            )
            db.add(u)
            await db.flush()

    # Faculty
    faculty_data = [
        ("ananya.roy@cms.com", "Dr. Ananya Roy", "CSE", "B.Tech in Computer Science & Engineering", "HOD & Associate Professor"),
        ("rajesh.sharma@cms.com", "Prof. Rajesh Sharma", "ECE", "B.Tech in Electronics & Communication", "Assistant Professor"),
        ("sunita.verma@cms.com", "Dr. Sunita Verma", "EE", "B.Tech in Computer Science & Engineering", "Senior Professor"),
    ]
    for email, name, d_code, c_name, desig in faculty_data:
        res = await db.execute(select(User).where(User.email == email))
        f_u = res.scalars().first()
        if not f_u:
            f_u = User(
                email=email,
                hashed_password=hash_pw("Faculty@123"),
                name=name,
                user_type=UserType.faculty,
                account_status=AccountStatus.active,
                role_id=roles_dict["faculty"].id
            )
            db.add(f_u)
            await db.flush()

            f_prof = FacultyProfile(
                user_id=f_u.id,
                course_id=course_dict[c_name].id,
                department_id=dept_dict[d_code].id,
                designation=desig,
                employment_status=EmploymentStatus.active
            )
            db.add(f_prof)

    # Staff
    staff_data = [
        ("guard@cms.com", "Gate Security Terminal", "Main Gate Officer"),
        ("librarian@cms.com", "Central Library Head", "Head Librarian"),
        ("mess.supervisor@cms.com", "Mess Supervisor", "Dining Hall Manager"),
    ]
    for email, name, desig in staff_data:
        res = await db.execute(select(User).where(User.email == email))
        s_u = res.scalars().first()
        if not s_u:
            s_u = User(
                email=email,
                hashed_password=hash_pw("Guard@123" if "guard" in email else "Staff@123"),
                name=name,
                user_type=UserType.staff,
                account_status=AccountStatus.active,
                role_id=roles_dict["staff"].id
            )
            db.add(s_u)
            await db.flush()

            s_prof = StaffProfile(
                user_id=s_u.id,
                department_id=dept_dict["CSE"].id,
                designation=desig,
                employment_status=EmploymentStatus.active
            )
            db.add(s_prof)

    # Students (10 Students)
    students_info = [
        ("soumya@cms.com", "Soumya Ranjan Sahoo", "2301230001", "21/CSE/001", "B.Tech in Computer Science & Engineering", "CSE", 2021, 5, "A", 3, rooms_list[0].id),
        ("priya@cms.com", "Priya Mishra", "2301230002", "21/CSE/002", "B.Tech in Computer Science & Engineering", "CSE", 2021, 5, "A", 3, rooms_list[8].id),
        ("rahul@cms.com", "Rahul Das", "2301230003", "22/ECE/003", "B.Tech in Electronics & Communication", "ECE", 2022, 3, "B", 2, rooms_list[1].id),
        ("ananya.sen@cms.com", "Ananya Sen", "2301230004", "21/CSE/004", "B.Tech in Computer Science & Engineering", "CSE", 2021, 5, "A", 3, rooms_list[9].id),
        ("amit.patel@cms.com", "Amit Patel", "2301230005", "20/ME/005", "B.Tech in Mechanical Engineering", "ME", 2020, 7, "A", 4, rooms_list[2].id),
        ("sneha.mohanty@cms.com", "Sneha Mohanty", "2301230006", "23/CSE/006", "B.Tech in Computer Science & Engineering", "CSE", 2023, 1, "A", 1, rooms_list[10].id),
        ("vikram.singh@cms.com", "Vikram Singh", "2301230007", "21/ECE/007", "B.Tech in Electronics & Communication", "ECE", 2021, 5, "B", 3, rooms_list[3].id),
        ("pooja.sharma@cms.com", "Pooja Sharma", "2301230008", "22/ECE/008", "B.Tech in Electronics & Communication", "ECE", 2022, 3, "A", 2, rooms_list[11].id),
        ("rohan.kumar@cms.com", "Rohan Kumar", "2301230009", "20/CSE/009", "B.Tech in Computer Science & Engineering", "CSE", 2020, 7, "B", 4, rooms_list[4].id),
        ("divya.swain@cms.com", "Divya Swain", "2301230010", "23/ME/010", "B.Tech in Mechanical Engineering", "ME", 2023, 1, "A", 1, rooms_list[12].id),
    ]

    student_users = {}
    for email, name, reg_no, roll_no, c_name, d_code, adm_yr, sem, sec, yr, rm_id in students_info:
        res = await db.execute(select(User).where(User.email == email))
        st_u = res.scalars().first()
        if not st_u:
            st_u = User(
                email=email,
                hashed_password=hash_pw("Student@123"),
                name=name,
                user_type=UserType.student,
                account_status=AccountStatus.active,
                role_id=roles_dict["student"].id
            )
            db.add(st_u)
            await db.flush()

            st_prof = StudentProfile(
                user_id=st_u.id,
                registration_no=reg_no,
                roll_no=roll_no,
                course_id=course_dict[c_name].id,
                department_id=dept_dict[d_code].id,
                admission_year=adm_yr,
                current_semester=sem,
                section=sec,
                year=yr,
                room_id=rm_id,
                academic_status=AcademicStatus.enrolled
            )
            db.add(st_prof)
        student_users[email] = st_u

    # Parents
    parents_data = [
        ("ramesh.sahoo@cms.com", "Ramesh Chandra Sahoo", "soumya@cms.com", "Father"),
        ("sunanda.mishra@cms.com", "Sunanda Mishra", "priya@cms.com", "Mother"),
    ]
    for p_email, p_name, ch_email, rel in parents_data:
        res = await db.execute(select(User).where(User.email == p_email))
        p_u = res.scalars().first()
        ch_u = student_users[ch_email]
        if not p_u:
            p_u = User(
                email=p_email,
                hashed_password=hash_pw("Parent@123"),
                name=p_name,
                user_type=UserType.parent,
                account_status=AccountStatus.active,
                role_id=roles_dict["parent"].id
            )
            db.add(p_u)
            await db.flush()

            p_prof = ParentProfile(
                user_id=p_u.id,
                student_id=ch_u.id,
                relationship_type=rel,
                emergency_contact="+91 9876543210"
            )
            db.add(p_prof)

            pl_req = ParentLinkRequest(
                parent_user_id=p_u.id,
                student_id=ch_u.id,
                relationship_type=rel,
                status=ParentLinkStatus.approved,
                share_gate_pass=True,
                share_attendance=True,
                share_marksheet=True,
                share_outpass=True
            )
            db.add(pl_req)

    # Pending User Applications
    pending_users = [
        ("applicant.pending@cms.com", "Alok Mohapatra", "student", AccountStatus.pending, {"user_id_str": "2101102099", "course_id": str(course_dict["B.Tech in Computer Science & Engineering"].id), "department_id": str(dept_dict["CSE"].id), "year": 1}),
        ("applicant.rejected@cms.com", "Biswajit Behera", "faculty", AccountStatus.rejected, {"employee_id": "EMP-999", "designation": "Lecturer"}, "Invalid Employee ID credential verification failed"),
    ]
    for u_email, u_name, t_role, acc_stat, app_data, *note in pending_users:
        res = await db.execute(select(User).where(User.email == u_email))
        if not res.scalars().first():
            usr = User(
                email=u_email,
                hashed_password=hash_pw("User@123"),
                name=u_name,
                user_type=UserType.user,
                account_status=acc_stat,
                target_role=t_role,
                application_data=app_data,
                status_note=note[0] if note else None,
                role_id=roles_dict["user"].id
            )
            db.add(usr)

    return student_users
