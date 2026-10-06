import sys
import os
from datetime import datetime, timedelta, timezone, date

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import (
    StudentProfile, FacultyProfile, StaffProfile, ParentProfile, AcademicStatus, EmploymentStatus
)
from app.models.rbac import Role
from app.models.academic import Department, Course
from app.models.infrastructure import Building, Room, BuildingType, RoomType
from app.models.notice import Notice
from app.models.complaint import Complaint, ComplaintCategory, ComplaintStatus
from app.models.outpass import Outpass, OutpassStatus
from app.models.gate_pass import QuickGatePass, GatePassReason, GatePassStatus
from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
from app.models.mess import MessMenu, MealType, DayOfWeek, MessFeedback
from app.models.finance import FeeDue, FeeStatus
from app.models.document import DocumentRequest, DocumentType, DocumentStatus, DocumentUrgency
from app.core.security import hash_password

def hash_pw(pw: str) -> str:
    return hash_password(pw)

async def seed_data():
    print("🚀 Starting Comprehensive BPUT CMS Demo Data Population...")
    async with AsyncSessionLocal() as db:
        # =====================================================================
        # 1. ROLES & RBAC SEEDING
        # =====================================================================
        print("📌 Seeding Roles & RBAC Permissions...")
        roles_data = [
            ("admin", "Administrator", "Full system administration and control"),
            ("faculty", "Faculty", "Teaching staff and department management"),
            ("student", "Student", "Enrolled student account"),
            ("parent", "Parent", "Parent or legal guardian account"),
            ("staff", "Staff", "Administrative and operational support staff"),
            ("user", "General User", "Unassigned onboarding account"),
        ]
        roles_dict = {}
        for r_name, r_disp, r_desc in roles_data:
            res = await db.execute(select(Role).where(Role.name == r_name))
            role_obj = res.scalars().first()
            if not role_obj:
                role_obj = Role(name=r_name, description=r_desc)
                db.add(role_obj)
                await db.flush()
            roles_dict[r_name] = role_obj

        # =====================================================================
        # 2. DEPARTMENTS & COURSES
        # =====================================================================
        print("📌 Seeding Academic Departments & Courses...")
        dept_data = [
            ("CSE", "Department of Computer Science & Engineering", "academic"),
            ("ECE", "Department of Electronics & Communication Engineering", "academic"),
            ("EE", "Department of Electrical Engineering", "academic"),
            ("ME", "Department of Mechanical Engineering", "academic"),
            ("CE", "Department of Civil Engineering", "academic"),
        ]
        dept_dict = {}
        for code, name, d_type in dept_data:
            res = await db.execute(select(Department).where(Department.code == code))
            d_obj = res.scalars().first()
            if not d_obj:
                d_obj = Department(code=code, name=name, department_type=d_type)
                db.add(d_obj)
                await db.flush()
            dept_dict[code] = d_obj

        course_data = [
            ("B.Tech in Computer Science & Engineering", 4),
            ("B.Tech in Electronics & Communication", 4),
            ("B.Tech in Mechanical Engineering", 4),
            ("M.Tech in Software Engineering", 2),
            ("Master of Business Administration", 2),
        ]
        course_dict = {}
        for c_name, duration in course_data:
            res = await db.execute(select(Course).where(Course.name == c_name))
            c_obj = res.scalars().first()
            if not c_obj:
                c_obj = Course(
                    name=c_name, duration_years=duration, is_active=True
                )
                db.add(c_obj)
                await db.flush()
            course_dict[c_name] = c_obj

        # =====================================================================
        # 3. BUILDINGS & ROOMS (Academic & Hostels)
        # =====================================================================
        print("📌 Seeding Campus Infrastructure (Academic Blocks & Hostels)...")
        bld_data = [
            ("Ramanujan Academic Block", "RAM", BuildingType.academic, 4),
            ("Aryabhata Seminar Complex", "ARYA", BuildingType.academic, 2),
            ("Kalam Boys Hostel", "KLM", BuildingType.hostel, 3),
            ("Sarojini Girls Hostel", "SRJ", BuildingType.hostel, 3),
        ]
        bld_dict = {}
        for name, code, b_type, floors in bld_data:
            res = await db.execute(select(Building).where(Building.code == code))
            b_obj = res.scalars().first()
            if not b_obj:
                b_obj = Building(name=name, code=code, building_type=b_type, total_floors=floors)
                db.add(b_obj)
                await db.flush()
            bld_dict[code] = b_obj

        rooms_list = []
        # Kalam Boys Hostel Rooms
        for r_num in ["101", "102", "103", "104", "201", "202", "203", "204"]:
            res = await db.execute(
                select(Room).where(Room.building_id == bld_dict["KLM"].id).where(Room.room_number == r_num)
            )
            rm = res.scalars().first()
            if not rm:
                rm = Room(
                    building_id=bld_dict["KLM"].id,
                    room_number=r_num,
                    floor=int(r_num[0]),
                    room_type=RoomType.hostel_room,
                    capacity=2
                )
                db.add(rm)
                await db.flush()
            rooms_list.append(rm)

        # Sarojini Girls Hostel Rooms
        for r_num in ["101", "102", "103", "104", "201", "202"]:
            res = await db.execute(
                select(Room).where(Room.building_id == bld_dict["SRJ"].id).where(Room.room_number == r_num)
            )
            rm = res.scalars().first()
            if not rm:
                rm = Room(
                    building_id=bld_dict["SRJ"].id,
                    room_number=r_num,
                    floor=int(r_num[0]),
                    room_type=RoomType.hostel_room,
                    capacity=2
                )
                db.add(rm)
                await db.flush()
            rooms_list.append(rm)

        # =====================================================================
        # 4. USERS & PROFILES SEEDING
        # =====================================================================
        print("📌 Seeding Users (Admins, Faculty, Staff, Students, Parents)...")

        # 4a. Admin Accounts
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

        # 4b. Faculty Accounts
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

        # 4c. Staff Accounts
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

        # 4d. Student Accounts (10 Students)
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
            res = await db.execute(select(User).where(User.email == email).options(selectinload(User.student_profile)))
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
            else:
                if st_u.student_profile:
                    st_u.student_profile.registration_no = reg_no
                    st_u.student_profile.roll_no = roll_no
                    st_u.student_profile.admission_year = adm_yr
                    st_u.student_profile.current_semester = sem
                    st_u.student_profile.section = sec
                    st_u.student_profile.year = yr
                    st_u.student_profile.room_id = rm_id
            student_users[email] = st_u

        # 4e. Parent Accounts & Link Requests
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

                # Approved Parent Link Request
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

        # 4f. Pending & Rejected User Applications (Single-table user onboarding test)
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

        # =====================================================================
        # 5. NOTICES & ANNOUNCEMENTS
        # =====================================================================
        print("📌 Seeding Official Notices & Circulars...")
        admin_u = (await db.execute(select(User).where(User.email == "admin@cms.com"))).scalars().first()
        notices_seed = [
            ("Mid-Semester Examination Schedule - Autumn 2026", "Official timetable for B.Tech & M.Tech mid-term examinations commencing 15th October 2026. Hall tickets available on portal.", dept_dict["CSE"].id),
            ("Annual National Tech Symposium 'BPUT TechX 2026'", "Registration open for national level hackathon, robotics, and paper presentation event. Early bird prizes announced!", None),
            ("Hostel Gate Timings & Mandatory Digital QR Pass", "All resident students must generate a Quick Gate Pass before exiting the main campus gate. Late entry after 9:00 PM requires warden clearance.", dept_dict["CSE"].id),
            ("Central Library Extended Reading Room Hours", "Central Library will remain open until 11:30 PM during exam preparation week.", None)
        ]
        for title, content, dept_id in notices_seed:
            res = await db.execute(select(Notice).where(Notice.title == title))
            if not res.scalars().first():
                n_obj = Notice(
                    title=title,
                    content=content,
                    target_department_id=dept_id,
                    author_id=admin_u.id
                )
                db.add(n_obj)

        # =====================================================================
        # 6. COMPLAINTS & GRIEVANCES
        # =====================================================================
        print("📌 Seeding Student Complaints & Grievances...")
        soumya_u = student_users["soumya@cms.com"]
        priya_u = student_users["priya@cms.com"]
        
        complaints_seed = [
            (soumya_u.id, ComplaintCategory.wifi, "Kalam Boys Hostel", "Room 201", "Wi-Fi router signal intermittent during evening hours.", ComplaintStatus.in_progress, bld_dict["KLM"].id, rooms_list[0].id),
            (priya_u.id, ComplaintCategory.plumbing, "Sarojini Girls Hostel", "Floor 2", "Request to install additional water cooler in Sarojini Hall 2nd Floor.", ComplaintStatus.open, bld_dict["SRJ"].id, rooms_list[8].id),
            (soumya_u.id, ComplaintCategory.cleanliness, "Kalam Boys Hostel", "Mess", "Sunday dinner menu suggestion: Include vegetarian dessert options.", ComplaintStatus.resolved, bld_dict["KLM"].id, rooms_list[0].id),
            (priya_u.id, ComplaintCategory.electrical, "Academic Block A", "Computer Lab 1", "Computer Lab 1 PC-14 monitor display flickering.", ComplaintStatus.closed, bld_dict["RAM"].id, None),
        ]
        for u_id, cat, h_loc, r_loc, desc, c_stat, b_id, r_id in complaints_seed:
            res = await db.execute(select(Complaint).where(Complaint.raised_by == u_id).where(Complaint.description == desc))
            if not res.scalars().first():
                c_obj = Complaint(
                    raised_by=u_id,
                    category=cat,
                    location_hostel=h_loc,
                    location_room=r_loc,
                    description=desc,
                    status=c_stat,
                    building_id=b_id,
                    room_id=r_id
                )
                db.add(c_obj)

        # =====================================================================
        # 7. OUTPASSES & OVERNIGHT LEAVES
        # =====================================================================
        print("📌 Seeding Outpasses & Overnight Leaves...")
        now_dt = datetime.now(timezone.utc)
        outpasses_seed = [
            (soumya_u.id, "Weekend home visit to Cuttack", "Home - Cuttack", now_dt - timedelta(days=2), now_dt + timedelta(days=1), OutpassStatus.approved),
            (priya_u.id, "Consultation at AIIMS Bhubaneswar", "Bhubaneswar", now_dt - timedelta(days=5), now_dt - timedelta(days=4), OutpassStatus.completed),
            (soumya_u.id, "Family event function in city", "City Center", now_dt + timedelta(days=3), now_dt + timedelta(days=4), OutpassStatus.pending),
        ]
        for st_id, reason, dest, dep_time, ret_time, o_stat in outpasses_seed:
            res = await db.execute(select(Outpass).where(Outpass.student_id == st_id).where(Outpass.reason == reason))
            if not res.scalars().first():
                o_obj = Outpass(
                    student_id=st_id,
                    reason=reason,
                    destination=dest,
                    departure_time=dep_time,
                    expected_return_time=ret_time,
                    status=o_stat
                )
                db.add(o_obj)

        # =====================================================================
        # 8. QUICK GATE PASSES (Live Status, Countdown & Overdue)
        # =====================================================================
        print("📌 Seeding Quick Gate Passes (Checked-Out, Checked-In, Overdue)...")
        gate_passes_seed = [
            (soumya_u.id, GatePassReason.tea_snack, GatePassStatus.checked_out, now_dt - timedelta(minutes=15), now_dt + timedelta(minutes=45), False),
            (priya_u.id, GatePassReason.market_errand, GatePassStatus.checked_in, now_dt - timedelta(hours=3), now_dt - timedelta(hours=2), False),
            (student_users["rahul@cms.com"].id, GatePassReason.personal_work, GatePassStatus.overdue, now_dt - timedelta(hours=4), now_dt - timedelta(hours=1), True),
        ]
        for st_id, g_reason, g_stat, exit_t, exp_t, is_alert in gate_passes_seed:
            code = f"GP-{str(uuid4())[:6].upper()}"
            g_obj = QuickGatePass(
                student_id=st_id,
                pass_code=code,
                reason=g_reason,
                status=g_stat,
                exit_time=exit_t,
                expected_return_time=exp_t,
                actual_return_time=now_dt - timedelta(hours=2) if g_stat == GatePassStatus.checked_in else None,
                emergency_alert_sent=is_alert,
                qr_token_hash=f"hash_{code}"
            )
            db.add(g_obj)

        # =====================================================================
        # 9. MESS MENUS, RATINGS & OPT-OUTS
        # =====================================================================
        print("📌 Seeding Hostel Mess Menus & Student Feedback...")
        days = [DayOfWeek.monday, DayOfWeek.tuesday, DayOfWeek.wednesday, DayOfWeek.thursday, DayOfWeek.friday, DayOfWeek.saturday, DayOfWeek.sunday]
        for day in days:
            res = await db.execute(select(MessMenu).where(MessMenu.day_of_week == day).where(MessMenu.meal_type == MealType.lunch))
            if not res.scalars().first():
                db.add(MessMenu(day_of_week=day, meal_type=MealType.breakfast, items="Idli Sambhar, Masala Dosa, Tea/Coffee"))
                db.add(MessMenu(day_of_week=day, meal_type=MealType.lunch, items="Rice, Dal Tadka, Paneer Butter Masala, Chapati, Salad"))
                db.add(MessMenu(day_of_week=day, meal_type=MealType.dinner, items="Veg Biryani, Raita, Mixed Veg, Gulab Jamun"))

        # Feedback
        res_fb = await db.execute(select(MessFeedback).where(MessFeedback.student_id == soumya_u.id))
        if not res_fb.scalars().first():
            db.add(MessFeedback(student_id=soumya_u.id, date=date.today(), meal_type=MealType.lunch, rating=5, comments="Excellent lunch menu quality!"))
            db.add(MessFeedback(student_id=priya_u.id, date=date.today(), meal_type=MealType.breakfast, rating=4, comments="Breakfast was fresh and hot."))

        # =====================================================================
        # 10. FEE DUES & RECEIPTS
        # =====================================================================
        print("📌 Seeding Student Fee Dues & Payments...")
        fees_seed = [
            (soumya_u.id, "Odd Semester Tuition Fee 2026", 45000.0, 45000.0, FeeStatus.paid),
            (soumya_u.id, "Hostel & Dining Fee 2026", 25000.0, 0.0, FeeStatus.pending),
            (priya_u.id, "Odd Semester Tuition Fee 2026", 45000.0, 45000.0, FeeStatus.paid),
            (priya_u.id, "Hostel & Dining Fee 2026", 25000.0, 15000.0, FeeStatus.partial),
        ]
        for st_id, desc, total, paid, f_stat in fees_seed:
            res_fee = await db.execute(select(FeeDue).where(FeeDue.student_id == st_id).where(FeeDue.description == desc))
            if not res_fee.scalars().first():
                f_obj = FeeDue(
                    student_id=st_id,
                    description=desc,
                    total_amount=total,
                    paid_amount=paid,
                    status=f_stat,
                    due_date=now_dt + timedelta(days=15)
                )
                db.add(f_obj)

        # =====================================================================
        # 11. DOCUMENT REQUESTS
        # =====================================================================
        print("📌 Seeding Student Certificate & Document Requests...")
        docs_seed = [
            (soumya_u.id, DocumentType.bonafide, "Bona fide certificate for passport application", DocumentStatus.approved, DocumentUrgency.normal),
            (priya_u.id, DocumentType.transcript, "Official grade transcript for internship application", DocumentStatus.pending, DocumentUrgency.urgent),
            (soumya_u.id, DocumentType.character_certificate, "Conduct & character certificate", DocumentStatus.pending, DocumentUrgency.normal),
        ]
        for st_id, d_type, req_reason, d_stat, d_urg in docs_seed:
            res_doc = await db.execute(select(DocumentRequest).where(DocumentRequest.student_id == st_id).where(DocumentRequest.purpose == req_reason))
            if not res_doc.scalars().first():
                doc_obj = DocumentRequest(
                    student_id=st_id,
                    document_type=d_type,
                    purpose=req_reason,
                    status=d_stat,
                    urgency=d_urg
                )
                db.add(doc_obj)

        # Commit All Seed Data
        await db.commit()
        print("✅ COMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY!")
        print("\n🔑 DEMO ACCOUNTS CREATED:")
        print("┌───────────────────────────────────┬───────────────┬─────────────────────────┐")
        print("│ Email                             │ Password      │ Primary Role / Purpose  │")
        print("├───────────────────────────────────┼───────────────┼─────────────────────────┤")
        print("│ superadmin@cms.com                │ Super+Admin@123│ System Superadmin       │")
        print("│ admin@cms.com                     │ Admin@123     │ Campus Administrator    │")
        print("│ ananya.roy@cms.com                │ Faculty@123   │ HOD CSE (Faculty)       │")
        print("│ guard@cms.com                     │ Guard@123     │ Main Gate Security Guard│")
        print("│ soumya@cms.com                    │ Student@123   │ Student (Kalam Hall)    │")
        print("│ priya@cms.com                     │ Student@123   │ Student (Sarojini Hall) │")
        print("│ ramesh.sahoo@cms.com              │ Parent@123    │ Parent (Father of Soumya)│")
        print("│ applicant.pending@cms.com         │ User@123      │ Onboarding (Pending)    │")
        print("└───────────────────────────────────┴───────────────┴─────────────────────────┘")

if __name__ == "__main__":
    asyncio.run(seed_data())
