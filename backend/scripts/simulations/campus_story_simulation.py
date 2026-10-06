import asyncio
import sys
import logging
from typing import Dict, Any, Optional
import httpx
from colorama import Fore, Style, init

init(autoreset=True)

BASE_URL = "http://127.0.0.1:8000/api"

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CampusStory")

def print_header(title: str):
    print("\n" + "="*80)
    print(f"{Fore.CYAN}{Style.BRIGHT}  {title}{Style.RESET_ALL}")
    print("="*80 + "\n")

def print_act(act_num: int, title: str):
    print(f"\n{Fore.YELLOW}{Style.BRIGHT}🎬 ACT {act_num}: {title}{Style.RESET_ALL}")
    print("-" * 70)

def print_narrative(character: str, role: str, action: str, emoji: str = "👤"):
    print(f"{Fore.GREEN}{emoji} [{role}] {character}{Style.RESET_ALL}: {action}")

def print_result(success: bool, msg: str):
    if success:
        print(f"   {Fore.BLUE}↳ ✅ {msg}{Style.RESET_ALL}")
    else:
        print(f"   {Fore.RED}↳ ❌ {msg}{Style.RESET_ALL}")


class StorySimulation:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=30.0)
        self.tokens: Dict[str, str] = {}
        self.users: Dict[str, Dict[str, Any]] = {}

    async def close(self):
        await self.client.aclose()

    async def req(
        self, 
        method: str, 
        url: str, 
        token_key: Optional[str] = None, 
        json: Optional[dict] = None, 
        data: Optional[dict] = None, 
        params: Optional[dict] = None
    ):
        headers = {}
        if token_key and token_key in self.tokens:
            headers["Authorization"] = f"Bearer {self.tokens[token_key]}"
        res = await self.client.request(method, url, headers=headers, json=json, data=data, params=params)
        return res

    async def run(self):
        print_header("BPUT CAMPUS MANAGEMENT SYSTEM — REAL-WORLD NARRATIVE STORY SIMULATION")

        # ---------------------------------------------------------------------
        # ACT 1: MORNING ONBOARDING & ADMIN APPROVALS
        # ---------------------------------------------------------------------
        print_act(1, "Morning Onboarding & Role Approvals")

        # 1. Login SuperAdmin
        print_narrative("Dr. Admin Dash", "SuperAdmin", "Logging into BPUT CMS Portal...", "👨‍💼")
        res = await self.req("POST", "/auth/login", json={"email": "superadmin@cms.com", "password": "Super+Admin@123"})
        if res.status_code != 200:
            res = await self.req("POST", "/auth/login", json={"email": "admin@cms.com", "password": "Admin@123"})
        if res.status_code == 200:
            self.tokens["admin"] = res.json()["data"]["access_token"]
            print_result(True, "Dr. Admin Dash authenticated successfully.")
        else:
            print_result(False, f"Admin login failed: {res.text}")
            return

        # Fetch Reference Data
        dept_res = await self.req("GET", "/admin/departments", token_key="admin")
        course_res = await self.req("GET", "/admin/courses", token_key="admin")
        departments = dept_res.json().get("data", [])
        courses = course_res.json().get("data", [])
        
        cse_dept = next((d for d in departments if "Computer" in d["name"]), departments[0])
        cse_course = next((c for c in courses if "Computer" in c["name"]), courses[0])

        # Personas Data
        students_data = [
            {"name": "Rohan Mehta", "email": "rohan.mehta@bput.ac.in", "year": 3, "hostel": "Kalam Hostel"},
            {"name": "Priya Sharma", "email": "priya.sharma@bput.ac.in", "year": 2, "hostel": "Sarojini Hostel"},
            {"name": "Amit Patel", "email": "amit.patel@bput.ac.in", "year": 4, "hostel": "Raman Hostel"},
            {"name": "Sneha Rao", "email": "sneha.rao@bput.ac.in", "year": 1, "hostel": "Kalpana Hostel"},
            {"name": "Bikram Dash", "email": "bikram.dash@bput.ac.in", "year": 3, "hostel": "Bose Hostel"},
        ]

        parents_data = [
            {"name": "Sanjay Mehta", "email": "sanjay.mehta@gmail.com", "child_email": "rohan.mehta@bput.ac.in"},
            {"name": "Sunita Sharma", "email": "sunita.sharma@gmail.com", "child_email": "priya.sharma@bput.ac.in"},
            {"name": "Rajesh Patel", "email": "rajesh.patel@gmail.com", "child_email": "amit.patel@bput.ac.in"},
            {"name": "Kavita Rao", "email": "kavita.rao@gmail.com", "child_email": "sneha.rao@bput.ac.in"},
            {"name": "Manoj Dash", "email": "manoj.dash@gmail.com", "child_email": "bikram.dash@bput.ac.in"},
        ]

        # Register Students
        for idx, s in enumerate(students_data, start=101):
            s_name: str = str(s["name"])
            s_email: str = str(s["email"])
            print_narrative(s_name, "Student", "Registering student profile...", "🎓")
            reg_payload = {
                "email": s_email,
                "password": "StudentPassword123!",
                "name": s_name,
                "user_id": f"STU{idx}",
                "course_id": cse_course["id"],
                "department_id": cse_dept["id"],
                "year": s["year"],
                "hostel": s["hostel"]
            }
            res = await self.req("POST", "/auth/register", json=reg_payload)
            if res.status_code in [200, 201]:
                print_result(True, f"Registered student profile for {s_name}.")
            
            # Approve pending student status as Admin
            stu_list = await self.req("GET", "/admin/students", token_key="admin", params={"status": "pending"})
            if stu_list.status_code == 200:
                for pending_s in stu_list.json().get("data", []):
                    if pending_s.get("email") == s_email:
                        appr = await self.req("PATCH", f"/admin/students/{pending_s['id']}/status", token_key="admin", json={"status": "active"})
                        if appr.status_code == 200:
                            print_result(True, f"Admin approved student account for {s_name}.")

            # Login Student after activation to acquire full RBAC token
            l_res = await self.req("POST", "/auth/login", json={"email": s_email, "password": "StudentPassword123!"})
            if l_res.status_code == 200:
                self.tokens[s_email] = l_res.json()["data"]["access_token"]
                print_result(True, f"Logged in active student {s_name}.")

            # Fetch /auth/me to store user ID
            me_res = await self.req("GET", "/auth/me", token_key=s_email)
            if me_res.status_code == 200:
                self.users[s_email] = me_res.json()["data"]

        # Register & Login Parents
        for p in parents_data:
            p_name: str = str(p["name"])
            p_email: str = str(p["email"])
            print_narrative(p_name, "Parent", "Checking parent user account...", "👨‍👩‍👦")
            l_res = await self.req("POST", "/auth/login", json={"email": p_email, "password": "ParentPassword123!"})
            if l_res.status_code == 200:
                self.tokens[p_email] = l_res.json()["data"]["access_token"]
                self.users[p_email] = l_res.json()["data"]
                print_result(True, f"Logged in parent {p_name}.")

        # ---------------------------------------------------------------------
        # ACT 2: GUARDIAN LINKING & PRIVACY MATRIX
        # ---------------------------------------------------------------------
        print_act(2, "Guardian Linking & Student Privacy Consent Matrix")

        for p in parents_data:
            parent_email: str = str(p["email"])
            child_email: str = str(p["child_email"])
            p_name_act2: str = str(p["name"])
            print_narrative(p_name_act2, "Parent", f"Checking guardian link with {child_email}...", "🔍")
            
            p_link_res = await self.req("GET", "/parent-link/active", token_key=parent_email)
            if p_link_res.status_code == 200 and p_link_res.json().get("data"):
                link_info = p_link_res.json()["data"]
                print_result(True, f"Active guardian link status: {link_info['status'].upper()}")

            # Student checks incoming requests
            s_requests = await self.req("GET", "/parent-link/my-requests", token_key=child_email)
            if s_requests.status_code == 200 and s_requests.json().get("data"):
                reqs = s_requests.json()["data"]
                for r in reqs:
                    if r["status"] == "pending":
                        print_narrative(child_email, "Student", f"Approving guardian link from {p_name_act2} with privacy consents...", "🔒")
                        resp = await self.req("POST", f"/parent-link/{r['id']}/respond", token_key=child_email, json={
                            "action": "approve",
                            "share_gate_pass": True,
                            "share_attendance": True,
                            "share_marksheet": True,
                            "share_outpass": True
                        })
                        if resp.status_code == 200:
                            print_result(True, "Guardian Link approved! Privacy Matrix: Attendance=True, GatePass=True, Outpass=True.")

        # ---------------------------------------------------------------------
        # ACT 3: HOSTEL LIFE, MESS & OUTPASS WORKFLOW
        # ---------------------------------------------------------------------
        print_act(3, "Hostel Life, Mess Feedback & Outpass Workflow")

        # Rohan Mehta applies for weekend outpass
        rohan_email = "rohan.mehta@bput.ac.in"
        print_narrative("Rohan Mehta", "Student (CSE 3rd Year)", "Submitting weekend outpass request to visit home in Cuttack...", "🧳")
        outpass_payload = {
            "destination": "Cuttack, Odisha",
            "reason": "Family function and weekend visit",
            "departure_time": "2026-10-10T10:00:00Z",
            "expected_return_time": "2026-10-12T18:00:00Z"
        }
        out_res = await self.req("POST", "/outpasses", token_key=rohan_email, json=outpass_payload)
        if out_res.status_code in [200, 201]:
            outpass_id = out_res.json()["data"]["id"]
            print_result(True, f"Outpass request submitted. ID: {outpass_id}")

            # Admin / Faculty approves outpass
            print_narrative("Dr. Admin Dash", "Academic Dean", f"Reviewing Rohan's outpass request...", "👨‍🏫")
            appr_res = await self.req("PATCH", f"/outpasses/{outpass_id}/approve", token_key="admin")
            if appr_res.status_code == 200:
                print_result(True, "Outpass APPROVED by Dean!")

            # Security Guard departs Rohan
            print_narrative("Security Gate 1", "Guard", "Scanning Rohan's approved outpass QR code at Campus Main Gate...", "🚪")
            dep_res = await self.req("PATCH", f"/outpasses/{outpass_id}/depart", token_key="admin")
            if dep_res.status_code == 200:
                print_result(True, "Rohan marked DEPARTED from campus. Outpass status: ACTIVE")

            # Return Rohan back to campus
            print_narrative("Security Gate 1", "Guard", "Rohan returns to campus on Sunday evening. Scanning return QR code...", "🏠")
            ret_res = await self.req("PATCH", f"/outpasses/{outpass_id}/return", token_key="admin")
            if ret_res.status_code == 200:
                print_result(True, "Rohan marked RETURNED. Outpass status: COMPLETED")

        # ---------------------------------------------------------------------
        # ACT 4: FINANCE, FEES & CERTIFICATE ISSUANCE
        # ---------------------------------------------------------------------
        print_act(4, "Financial Dues & Official Document Certificates")

        # Admin issues Semester Fee for Priya Sharma
        priya_user_id = self.users.get("priya.sharma@bput.ac.in", {}).get("id")
        if priya_user_id:
            print_narrative("Finance Department", "Admin", f"Generating 4th Semester Tuition Fee Due for Priya Sharma...", "💳")
            fee_payload = {
                "student_id": priya_user_id,
                "fee_type": "Tuition Fee - 4th Semester",
                "description": "B.Tech ECE Semester 4 Tuition & Lab Fees",
                "total_amount": 45000.0,
                "due_date": "2026-11-15T00:00:00Z"
            }
            fee_res = await self.req("POST", "/finance", token_key="admin", json=fee_payload)
            if fee_res.status_code in [200, 201]:
                fee_id = fee_res.json()["data"]["id"]
                print_result(True, f"Created Fee Due entry: ₹45,000. ID: {fee_id}")

                # Priya checks her fees
                print_narrative("Priya Sharma", "Student", "Viewing fee dues on student dashboard...", "📑")
                my_fees = await self.req("GET", "/finance/mine", token_key="priya.sharma@bput.ac.in")
                if my_fees.status_code == 200:
                    print_result(True, f"Priya sees {len(my_fees.json()['data'])} active fee due(s).")

                # Priya makes payment
                print_narrative("Priya Sharma", "Student", "Paying tuition fee installment of ₹45,000 via Online UPI...", "💰")
                pay_res = await self.req("PATCH", f"/finance/{fee_id}", token_key="admin", json={
                    "paid_amount": 45000.0
                })
                if pay_res.status_code == 200:
                    print_result(True, "Payment recorded! Fee Status updated to: PAID")

        # Certificate Request
        print_narrative("Amit Patel", "Student (4th Year)", "Applying for Character Certificate for upcoming job placements...", "📜")
        doc_res = await self.req("POST", "/documents/requests", token_key="amit.patel@bput.ac.in", json={
            "document_type": "character_certificate",
            "purpose": "Campus Placement Drive Documentation",
            "urgency": "urgent"
        })
        if doc_res.status_code in [200, 201]:
            doc_id = doc_res.json()["data"]["id"]
            print_result(True, f"Submitted certificate request. Request ID: {doc_id}")

            # Admin approves certificate
            print_narrative("Academic Registrar", "Admin", f"Approving Character Certificate for Amit Patel...", "✒️")
            app_doc = await self.req("PATCH", f"/admin/documents/requests/{doc_id}/approve", token_key="admin", json={
                "notes": "Verified clean disciplinary record. Approved."
            })
            if app_doc.status_code == 200:
                print_result(True, "Certificate Approved by Registrar!")

            # Issue certificate file
            ready_doc = await self.req("PATCH", f"/admin/documents/requests/{doc_id}/ready", token_key="admin", json={
                "issued_file_url": f"http://localhost:8000/downloads/certificates/character_{doc_id[:8]}.pdf"
            })
            if ready_doc.status_code == 200:
                print_result(True, "Certificate generated and issued to student's portal!")

            # Amit downloads certificate
            dl_res = await self.req("GET", f"/documents/requests/{doc_id}/download", token_key="amit.patel@bput.ac.in")
            if dl_res.status_code == 200:
                print_result(True, f"Amit downloaded certificate: {dl_res.json()['data']['issued_file_url']}")
        else:
            print_result(False, f"Certificate request failed: {doc_res.text}")

        # ---------------------------------------------------------------------
        # ACT 5: CAMPUS SAFETY, AUDIENCE GROUPS & GRIEVANCES
        # ---------------------------------------------------------------------
        print_act(5, "Audience Group Notices & Campus Grievance Resolution")

        # Admin creates CSE Batch Audience Group
        print_narrative("Dr. Admin Dash", "SuperAdmin", "Creating Audience Group for '3rd Year B.Tech CSE Batch'...", "📢")
        ag_res = await self.req("POST", "/audience-groups", token_key="admin", json={
            "name": f"3rd Year CSE Batch {id(self)}",
            "description": "All 3rd Year Computer Science Students",
            "filter_criteria": {"department_id": cse_dept["id"], "year": 3}
        })
        if ag_res.status_code in [200, 201]:
            ag_id = ag_res.json()["data"]["id"]
            print_result(True, f"Audience Group created with dynamic filters. ID: {ag_id}")

            # Post targeted notice using Form Data
            notice_res = await self.req("POST", "/notices", token_key="admin", data={
                "title": "Upcoming Mid-Semester Examination Schedule",
                "content": "The Mid-Semester Examinations for 3rd Year B.Tech CSE will commence from October 20th. Please download datesheet.",
                "target_audience_group_id": ag_id
            })
            if notice_res.status_code in [200, 201]:
                print_result(True, "Targeted Academic Notice published to CSE 3rd Year Batch feed!")

        # Bikram Dash submits a Grievance using Form Data
        print_narrative("Bikram Dash", "Student", "Submitting a campus grievance regarding Library AC Unit malfunction...", "🛠️")
        griev_res = await self.req("POST", "/complaints", token_key="bikram.dash@bput.ac.in", data={
            "category": "electrical",
            "location_hostel": "Central Library",
            "location_room": "2nd Floor Reading Hall",
            "description": "The cooling unit on the 2nd floor reading hall is not functioning properly.",
            "visibility": "public"
        })
        if griev_res.status_code in [200, 201]:
            griev_id = griev_res.json()["data"]["id"]
            print_result(True, f"Grievance registered. Ticket ID: {griev_id}")

            # Admin resolves grievance
            print_narrative("Maintenance Dept", "Admin", f"Updating grievance status and marking resolved...", "🔧")
            sol_res = await self.req("PATCH", f"/complaints/{griev_id}/status", token_key="admin", json={
                "status": "resolved",
                "resolution_notes": "Maintenance technician repaired compressor fan unit."
            })
            if sol_res.status_code == 200:
                print_result(True, "Grievance marked RESOLVED. Notification sent to Bikram!")
        else:
            print_result(False, f"Grievance registration failed: {griev_res.text}")

        print_header("✨ BPUT CAMPUS STORY SIMULATION COMPLETED SUCCESSFULLY! ✨")


async def main():
    sim = StorySimulation()
    try:
        await sim.run()
    finally:
        await sim.close()

if __name__ == "__main__":
    asyncio.run(main())
