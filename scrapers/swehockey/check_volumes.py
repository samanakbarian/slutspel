import os, json
from google.cloud import bigquery

# Check period_shots and more details from game events
with open("data/swehockey/games/1005981.json", "r", encoding="utf-8") as f:
    g = json.load(f)
print("period_shots:", json.dumps(g.get("period_shots"), ensure_ascii=False, indent=2)[:500])
print("\nschedule_info:", json.dumps(g.get("schedule_info"), ensure_ascii=False, indent=2)[:500])
print("\nsummary:", json.dumps(g.get("summary"), ensure_ascii=False, indent=2)[:500])

# Check count of BJK games
files = os.listdir("data/swehockey/games")
print(f"\nTotal game event files (BJK): {len(files)}")

# Sportradar data count
c = bigquery.Client(project="granskaren-d51a1")
q1 = "SELECT COUNT(*) as cnt FROM `granskaren-d51a1.loven_staging_marts.dim_matches`"
total = list(c.query(q1))[0].cnt
print(f"Sportradar total matches in dim_matches: {total}")

# Swehockey schedule count
q2 = "SELECT COUNT(*) as cnt FROM `granskaren-d51a1.raw_sports.swehockey_schedule`"
sched = list(c.query(q2))[0].cnt
print(f"Swehockey schedule total: {sched}")
