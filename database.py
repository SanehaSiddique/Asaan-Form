# core/db.py
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

_client = AsyncIOMotorClient(settings.MONGODB_URL)
_db = _client[settings.DATABASE_NAME]
_collection = _db[settings.MONGODB_COLLECTION]

async def init_indexes():
    # Unique index on filename prevents duplicate names, even under race
    await _collection.create_index("filename", unique=True)

def get_collection():
    return _collection
