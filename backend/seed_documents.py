import asyncio
import os
import sys
from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.documents import DocumentType

DEFAULT_DOCUMENT_TYPES = [
    {
        "code": "BONAFIDE",
        "name": "Bonafide Student Certificate",
        "description": "Official certificate confirming student enrollment, branch, and academic year.",
        "fee": 0,
        "status": True,
        "approval_steps": ["HOD"],
        "fields_schema": {
            "purpose": {"type": "string", "label": "Purpose of Certificate", "required": True},
            "organization": {"type": "string", "label": "Submitting To / Organization", "required": True}
        }
    },
    {
        "code": "NOC",
        "name": "No Objection Certificate (NOC)",
        "description": "NOC for off-campus internships, industrial visits, or competitive exams.",
        "fee": 50,
        "status": True,
        "approval_steps": ["HOD", "REGISTRAR"],
        "fields_schema": {
            "company_name": {"type": "string", "label": "Company / Event Name", "required": True},
            "duration_weeks": {"type": "number", "label": "Duration (Weeks)", "required": True},
            "start_date": {"type": "string", "label": "Start Date", "required": True}
        }
    },
    {
        "code": "TRANSCRIPT",
        "name": "Official Academic Transcript",
        "description": "Certified cumulative grade transcript issuing semester-wise academic marks.",
        "fee": 200,
        "status": True,
        "approval_steps": ["EXAM_CELL", "REGISTRAR"],
        "fields_schema": {
            "copies": {"type": "number", "label": "Number of Copies", "required": True},
            "delivery_mode": {"type": "string", "label": "Delivery Mode (Digital/Physical)", "required": True}
        }
    },
    {
        "code": "CHARACTER",
        "name": "Character & Conduct Certificate",
        "description": "Official campus conduct certificate issued for employment or higher studies.",
        "fee": 0,
        "status": True,
        "approval_steps": ["WARDEN"],
        "fields_schema": {
            "reason": {"type": "string", "label": "Reason for Request", "required": True}
        }
    }
]

async def seed_documents():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding Document Type Definitions...")
        added_count = 0
        for dt_data in DEFAULT_DOCUMENT_TYPES:
            stmt = select(DocumentType).where(DocumentType.code == dt_data["code"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(DocumentType(**dt_data))
                added_count += 1

        await db.commit()
        print(f"✅ Seeding Document Types complete! Added: {added_count}, Existing: {len(DEFAULT_DOCUMENT_TYPES) - added_count}")

if __name__ == "__main__":
    asyncio.run(seed_documents())
