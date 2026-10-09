import asyncio
from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.services.application_service import ApplicationService

async def main():
    async with AsyncSessionLocal() as db:
        uow = UnitOfWork(db)
        service = ApplicationService(uow)
        apps = await service.list_applications()
        print(f"\n==========================================")
        print(f"Total Role Applications Found: {len(apps)}")
        print(f"==========================================")
        for app in apps:
            print(f"• ID: {app.id}")
            print(f"  Applicant: {app.applicant_name} ({app.applicant_email})")
            print(f"  Target Role: {app.target_role}")
            print(f"  Status: {app.status}")
            print(f"  Data: {app.application_data}")
            print("------------------------------------------")

if __name__ == "__main__":
    asyncio.run(main())
