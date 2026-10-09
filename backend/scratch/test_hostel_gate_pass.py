import asyncio
from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.services.hostel_service import HostelService
from app.services.gate_pass_service import GatePassService

async def main():
    async with AsyncSessionLocal() as db:
        uow = UnitOfWork(db)
        h_service = HostelService(uow)
        gp_service = GatePassService(uow)

        hostels, h_total = await h_service.list_hostels()
        print(f"\n==========================================")
        print(f"Hostel Buildings Count: {h_total}")
        for h in hostels:
            print(f"• Hostel: {h.name} (Capacity: {h.capacity})")

        passes, gp_total = await gp_service.list_all_passes()
        print(f"\nGate Passes Count: {gp_total}")
        for gp in passes:
            print(f"• Pass ID: {gp.id} | Student: {gp.student_name} | Pass Code: {gp.pass_code} | Status: {gp.status}")
        print(f"==========================================\n")

if __name__ == "__main__":
    asyncio.run(main())
