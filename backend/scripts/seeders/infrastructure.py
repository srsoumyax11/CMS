from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.infrastructure import Building, Room, BuildingType, RoomType

async def seed_infrastructure(db: AsyncSession):
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

    return bld_dict, rooms_list
