#!/usr/bin/env python3
"""
MongoDB Index Migration Script
Creates required indexes and TTL settings for Relasi4Warna.
Run on first deployment or as init container.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, DESCENDING


async def create_indexes():
    """Create all required MongoDB indexes."""
    
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "relasi4warna")
    
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Test connection
        await client.admin.command('ping')
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        sys.exit(1)
    
    indexes = {
        # Users collection
        "users": [
            IndexModel([("user_id", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("tier", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ],
        
        # Quiz attempts collection
        "quiz_attempts": [
            IndexModel([("attempt_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("series", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            # TTL index - delete incomplete attempts after 24 hours
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=86400,
                partialFilterExpression={"status": "in_progress"},
                name="ttl_incomplete_attempts"
            ),
        ],
        
        # Results collection
        "results": [
            IndexModel([("result_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("series", ASCENDING)]),
            IndexModel([("is_paid", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("primary_archetype", ASCENDING)]),
        ],
        
        # Reports collection
        "reports": [
            IndexModel([("report_id", ASCENDING)], unique=True),
            IndexModel([("result_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("language", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ],
        
        # Elite reports collection
        "elite_reports": [
            IndexModel([("report_id", ASCENDING)], unique=True),
            IndexModel([("result_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ],
        
        # Elite+ reports collection
        "elite_plus_reports": [
            IndexModel([("report_id", ASCENDING)], unique=True),
            IndexModel([("result_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ],
        
        # Payments collection
        "payments": [
            IndexModel([("payment_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("result_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ],
        
        # Questions collection
        "questions": [
            IndexModel([("id", ASCENDING)], unique=True),
            IndexModel([("series", ASCENDING)]),
            IndexModel([("category", ASCENDING)]),
        ],
        
        # HITL moderation queue
        "hitl_queue": [
            IndexModel([("queue_id", ASCENDING)], unique=True),
            IndexModel([("result_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("risk_level", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            # TTL index - delete reviewed items after 30 days
            IndexModel(
                [("reviewed_at", ASCENDING)],
                expireAfterSeconds=2592000,
                partialFilterExpression={"status": "reviewed"},
                name="ttl_reviewed_hitl"
            ),
        ],
        
        # Sessions collection (for rate limiting, etc.)
        "sessions": [
            IndexModel([("session_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            # TTL index - expire sessions after 7 days
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=604800,
                name="ttl_sessions"
            ),
        ],
        
        # Audit log
        "audit_log": [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("action", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            # TTL index - delete audit logs after 90 days
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=7776000,
                name="ttl_audit_log"
            ),
        ],
    }
    
    print("\nCreating indexes...")
    
    for collection_name, collection_indexes in indexes.items():
        print(f"\n  Collection: {collection_name}")
        collection = db[collection_name]
        
        for index in collection_indexes:
            try:
                index_name = index.document.get("name", str(index.document.get("key")))
                await collection.create_indexes([index])
                print(f"    ✓ Index created: {index_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"    ○ Index exists: {index_name}")
                else:
                    print(f"    ✗ Index failed: {index_name} - {e}")
    
    print("\n✓ Index migration complete!")
    
    # Print collection stats
    print("\nCollection statistics:")
    collections = await db.list_collection_names()
    for coll_name in sorted(collections):
        count = await db[coll_name].count_documents({})
        print(f"  {coll_name}: {count} documents")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_indexes())
