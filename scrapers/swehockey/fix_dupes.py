"""Fix duplicate rows in BigQuery swehockey tables."""
from google.cloud import bigquery

PROJECT = "granskaren-d51a1"
DATASET = "raw_sports"
c = bigquery.Client(project=PROJECT)

def dedup_table(table_name, partition_cols):
    fqn = f"{PROJECT}.{DATASET}.{table_name}"
    
    total = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}`"))[0].cnt
    print(f"\n=== {table_name}: {total} total rows ===")
    
    partition = ", ".join(partition_cols)
    q = f"""SELECT {partition}, COUNT(*) as cnt 
            FROM `{fqn}` GROUP BY {partition} HAVING cnt > 1 
            ORDER BY cnt DESC LIMIT 5"""
    dupes = list(c.query(q))
    
    if not dupes:
        print("  No duplicates!")
        return
    
    print(f"  Found {len(dupes)} duplicate groups (showing top 5)")
    for r in dupes:
        vals = [str(getattr(r, col)) for col in partition_cols]
        print(f"  - {', '.join(vals)}: {r.cnt}x")
    
    # Deduplicate using ROW_NUMBER
    print(f"  Deduplicating...")
    dedup_q = f"""
    CREATE OR REPLACE TABLE `{fqn}` AS
    SELECT * EXCEPT(rn) FROM (
        SELECT *, ROW_NUMBER() OVER(
            PARTITION BY {partition} ORDER BY scraped_at DESC
        ) as rn FROM `{fqn}`
    ) WHERE rn = 1
    """
    c.query(dedup_q).result()
    
    new_total = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}`"))[0].cnt
    print(f"  Done: {total} -> {new_total} rows (removed {total - new_total} dupes)")

dedup_table("swehockey_player_stats", ["player_name", "team_code", "season_group_id"])
dedup_table("swehockey_goalie_stats", ["goalie_name", "team_code", "season_group_id"])
dedup_table("swehockey_schedule", ["match_date", "home_team", "away_team"])
dedup_table("swehockey_standings", ["team_name"])

print("\nAll done!")
