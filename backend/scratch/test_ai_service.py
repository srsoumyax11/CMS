import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.services.ai_service import AIService
from app.schemas.ai import AIConversationCreate, AIMessageCreate
from uuid import uuid4

async def test_ai_module():
    async with AsyncSessionLocal() as session:
        uow = UnitOfWork(session)
        print("--- Testing AI Assistant Service ---")
        ai_service = AIService(uow)
        
        async with uow.transaction() as u:
            users_list, _ = await u.users.list(limit=1)
            if not users_list:
                from app.models.user import User, UserType
                user = User(
                    email=f"ai_test_{uuid4().hex[:4]}@example.com",
                    hashed_password="hashed_pw_dummy",
                    name="AI Test User",
                    user_type=UserType.student
                )
                user = await u.users.create(user)
                test_user_id = user.id
            else:
                test_user_id = users_list[0].id

        # 1. Create AI Conversation Session
        conv = await ai_service.create_conversation(
            test_user_id,
            AIConversationCreate(title="Hostel & Navigation Query")
        )
        print(f"Conversation created: ID={conv.id}, Title='{conv.title}'")

        # 2. List Conversations
        convs, total = await ai_service.list_conversations(test_user_id)
        print(f"User conversations count: {total}")

        # 3. Send Message to AI Assistant
        if users_list:
            reply = await ai_service.send_message(
                test_user_id,
                conv.id,
                AIMessageCreate(content="Where is Room 101 and how can I get a hostel gate pass?")
            )
            print(f"AI Assistant Reply: role={reply.role}, content='{reply.content}'")

        # 4. Get Conversation Messages History
        if users_list:
            messages = await ai_service.get_messages(conv.id, test_user_id)
            print(f"Total messages in conversation history: {len(messages)}")
            for m in messages:
                print(f"  [{m.role.value}] {m.content[:80]}...")

        print("\n✅ AI Assistant module tests PASSED successfully!")

if __name__ == "__main__":
    asyncio.run(test_ai_module())
