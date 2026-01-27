#!/usr/bin/env python3
"""
Whitepaper Data Generator
Generates real-time statistics from production database for whitepaper updates.

Usage:
    python3 generate_whitepaper_data.py

Output:
    - whitepaper_data.json (raw data)
    - whitepaper_stats.md (formatted statistics)
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'relasi4warna')

# Minimum sample size for statistical validity
MIN_SAMPLE_SIZE = 100

async def get_whitepaper_statistics():
    """Generate all statistics needed for whitepaper."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    stats = {
        "generated_at": datetime.utcnow().isoformat(),
        "data_status": "production" if await has_sufficient_data(db) else "simulated",
        "sample_sizes": {},
        "distributions": {},
        "matrices": {},
        "trends": {}
    }
    
    # 1. Sample Sizes
    stats["sample_sizes"] = {
        "total_users": await db.users.count_documents({}),
        "total_assessments_r4": await db.r4_responses.count_documents({}),
        "total_assessments_old": await db.results.count_documents({}),
        "total_reports": await db.r4_reports.count_documents({}),
        "total_couple_reports": await db.r4_couple_reports.count_documents({}),
        "total_family_groups": await db.r4_family_groups.count_documents({}),
        "analytics_events": await db.r4_analytics_events.count_documents({})
    }
    stats["sample_sizes"]["total_assessments"] = (
        stats["sample_sizes"]["total_assessments_r4"] + 
        stats["sample_sizes"]["total_assessments_old"]
    )
    
    # 2. Need Distribution (from r4_responses)
    need_dist = await aggregate_dimension(db, "r4_responses", "primary_need", [
        "need_validation", "need_harmony", "need_control", "need_autonomy"
    ])
    stats["distributions"]["needs"] = need_dist
    
    # 3. Conflict Distribution
    conflict_dist = await aggregate_dimension(db, "r4_responses", "primary_conflict_style", [
        "conflict_avoid", "conflict_appease", "conflict_freeze", "conflict_attack"
    ])
    stats["distributions"]["conflicts"] = conflict_dist
    
    # 4. Color Distribution (from old results)
    color_dist = await aggregate_dimension(db, "results", "primary_color", [
        "color_red", "color_yellow", "color_green", "color_blue"
    ])
    stats["distributions"]["colors"] = color_dist
    
    # 5. Need x Conflict Matrix
    stats["matrices"]["need_conflict"] = await generate_need_conflict_matrix(db)
    
    # 6. Trends (if enough data)
    if stats["sample_sizes"]["analytics_events"] >= MIN_SAMPLE_SIZE:
        stats["trends"] = await generate_trends(db)
    
    return stats

async def has_sufficient_data(db) -> bool:
    """Check if we have enough data for statistical validity."""
    total = await db.r4_responses.count_documents({})
    total += await db.results.count_documents({})
    return total >= MIN_SAMPLE_SIZE

async def aggregate_dimension(db, collection, field, expected_values):
    """Aggregate data by a specific dimension."""
    pipeline = [
        {"$match": {field: {"$exists": True, "$ne": None}}},
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    results = await db[collection].aggregate(pipeline).to_list(length=100)
    total = sum(r["count"] for r in results)
    
    distribution = {}
    for value in expected_values:
        found = next((r for r in results if r["_id"] == value), None)
        count = found["count"] if found else 0
        percentage = round((count / total * 100), 1) if total > 0 else 0
        distribution[value] = {
            "count": count,
            "percentage": percentage
        }
    
    distribution["_total"] = total
    return distribution

async def generate_need_conflict_matrix(db):
    """Generate Need x Conflict cross-tabulation matrix."""
    pipeline = [
        {"$match": {
            "primary_need": {"$exists": True, "$ne": None},
            "primary_conflict_style": {"$exists": True, "$ne": None}
        }},
        {"$group": {
            "_id": {
                "need": "$primary_need",
                "conflict": "$primary_conflict_style"
            },
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.r4_responses.aggregate(pipeline).to_list(length=100)
    total = sum(r["count"] for r in results)
    
    matrix = {}
    needs = ["need_validation", "need_harmony", "need_control", "need_autonomy"]
    conflicts = ["conflict_avoid", "conflict_appease", "conflict_freeze", "conflict_attack"]
    
    for need in needs:
        matrix[need] = {}
        for conflict in conflicts:
            found = next((r for r in results 
                         if r["_id"]["need"] == need and r["_id"]["conflict"] == conflict), None)
            count = found["count"] if found else 0
            percentage = round((count / total * 100), 1) if total > 0 else 0
            matrix[need][conflict] = {
                "count": count,
                "percentage": percentage
            }
    
    matrix["_total"] = total
    return matrix

async def generate_trends(db):
    """Generate time-based trends from analytics data."""
    # Last 30 days daily breakdown
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
            },
            "events": {"$sum": 1},
            "unique_users": {"$addToSet": "$user_id"}
        }},
        {"$project": {
            "date": "$_id",
            "events": 1,
            "unique_users": {"$size": "$unique_users"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.r4_analytics_events.aggregate(pipeline).to_list(length=100)
    
    return {
        "daily_activity": results,
        "total_events_30d": sum(r.get("events", 0) for r in results),
        "avg_daily_events": round(sum(r.get("events", 0) for r in results) / max(len(results), 1), 1)
    }

def generate_markdown_report(stats):
    """Generate a markdown-formatted statistics report."""
    md = f"""# Whitepaper Data Report
Generated: {stats['generated_at']}
Data Status: **{stats['data_status'].upper()}**

## Sample Sizes
| Metric | Count |
|--------|-------|
| Total Users | {stats['sample_sizes']['total_users']:,} |
| Total Assessments | {stats['sample_sizes']['total_assessments']:,} |
| RELASI4™ Assessments | {stats['sample_sizes']['total_assessments_r4']:,} |
| Legacy Assessments | {stats['sample_sizes']['total_assessments_old']:,} |
| Reports Generated | {stats['sample_sizes']['total_reports']:,} |
| Couple Reports | {stats['sample_sizes']['total_couple_reports']:,} |
| Family Groups | {stats['sample_sizes']['total_family_groups']:,} |

## Need Distribution
| Need | Count | Percentage |
|------|-------|------------|
"""
    
    needs = stats['distributions'].get('needs', {})
    for need, data in needs.items():
        if not need.startswith('_'):
            label = need.replace('need_', '').title()
            md += f"| {label} | {data.get('count', 0):,} | {data.get('percentage', 0)}% |\n"
    
    md += f"\n**Total:** {needs.get('_total', 0):,}\n"
    
    md += """
## Conflict Distribution
| Conflict Style | Count | Percentage |
|----------------|-------|------------|
"""
    
    conflicts = stats['distributions'].get('conflicts', {})
    for conflict, data in conflicts.items():
        if not conflict.startswith('_'):
            label = conflict.replace('conflict_', '').title()
            md += f"| {label} | {data.get('count', 0):,} | {data.get('percentage', 0)}% |\n"
    
    md += f"\n**Total:** {conflicts.get('_total', 0):,}\n"
    
    md += """
## Need × Conflict Matrix
"""
    
    matrix = stats['matrices'].get('need_conflict', {})
    if matrix:
        md += "| Need \\ Conflict | Avoid | Appease | Freeze | Attack |\n"
        md += "|-----------------|-------|---------|--------|--------|\n"
        
        for need in ["need_validation", "need_harmony", "need_control", "need_autonomy"]:
            row = matrix.get(need, {})
            label = need.replace('need_', '').title()
            avoid = row.get('conflict_avoid', {}).get('percentage', 0)
            appease = row.get('conflict_appease', {}).get('percentage', 0)
            freeze = row.get('conflict_freeze', {}).get('percentage', 0)
            attack = row.get('conflict_attack', {}).get('percentage', 0)
            md += f"| {label} | {avoid}% | {appease}% | {freeze}% | {attack}% |\n"
    
    md += """
---
*This report is auto-generated from production data.*
*Update by running: `python3 scripts/generate_whitepaper_data.py`*
"""
    
    return md

async def main():
    print("🔄 Generating whitepaper statistics...")
    
    stats = await get_whitepaper_statistics()
    
    # Save JSON data
    json_path = "/app/docs/whitepaper_data.json"
    with open(json_path, "w") as f:
        json.dump(stats, f, indent=2, default=str)
    print(f"✅ JSON data saved to: {json_path}")
    
    # Save Markdown report
    md_report = generate_markdown_report(stats)
    md_path = "/app/docs/whitepaper_stats.md"
    with open(md_path, "w") as f:
        f.write(md_report)
    print(f"✅ Markdown report saved to: {md_path}")
    
    # Print summary
    print(f"\n📊 Data Status: {stats['data_status'].upper()}")
    print(f"📈 Total Assessments: {stats['sample_sizes']['total_assessments']:,}")
    
    if stats['data_status'] == 'simulated':
        print("\n⚠️  Data is below minimum threshold. Using simulated data in whitepaper.")
        print(f"    Minimum required: {MIN_SAMPLE_SIZE} assessments")
        print(f"    Current: {stats['sample_sizes']['total_assessments']} assessments")

if __name__ == "__main__":
    asyncio.run(main())
