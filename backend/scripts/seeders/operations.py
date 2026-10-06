from datetime import datetime, timedelta, timezone, date
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.notice import Notice
from app.models.complaint import Complaint, ComplaintCategory, ComplaintStatus
from app.models.outpass import Outpass, OutpassStatus
from app.models.gate_pass import QuickGatePass, GatePassReason, GatePassStatus
from app.models.mess import MessMenu, MealType, DayOfWeek, MessFeedback
from app.models.finance import FeeDue, FeeStatus
from app.models.document import DocumentRequest, DocumentType, DocumentStatus, DocumentUrgency

async def seed_operations(db: AsyncSession, dept_dict: dict, bld_dict: dict, rooms_list: list, student_users: dict):
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

    print("📌 Seeding Hostel Mess Menus & Student Feedback...")
    days = [DayOfWeek.monday, DayOfWeek.tuesday, DayOfWeek.wednesday, DayOfWeek.thursday, DayOfWeek.friday, DayOfWeek.saturday, DayOfWeek.sunday]
    for day in days:
        res = await db.execute(select(MessMenu).where(MessMenu.day_of_week == day).where(MessMenu.meal_type == MealType.lunch))
        if not res.scalars().first():
            db.add(MessMenu(day_of_week=day, meal_type=MealType.breakfast, items="Idli Sambhar, Masala Dosa, Tea/Coffee"))
            db.add(MessMenu(day_of_week=day, meal_type=MealType.lunch, items="Rice, Dal Tadka, Paneer Butter Masala, Chapati, Salad"))
            db.add(MessMenu(day_of_week=day, meal_type=MealType.dinner, items="Veg Biryani, Raita, Mixed Veg, Gulab Jamun"))

    res_fb = await db.execute(select(MessFeedback).where(MessFeedback.student_id == soumya_u.id))
    if not res_fb.scalars().first():
        db.add(MessFeedback(student_id=soumya_u.id, date=date.today(), meal_type=MealType.lunch, rating=5, comments="Excellent lunch menu quality!"))
        db.add(MessFeedback(student_id=priya_u.id, date=date.today(), meal_type=MealType.breakfast, rating=4, comments="Breakfast was fresh and hot."))

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
