import asyncio
import sys
from scripts.create_users import create_user_account

async def main():
    print("=== CMS Script Runner ===")
    print("1. Create Random Users")
    print("2. Exit")
    
    choice = input("\nSelect an option (1-2): ").strip()
    
    if choice == '1':
        await create_user_account()
    else:
        print("Exiting...")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
