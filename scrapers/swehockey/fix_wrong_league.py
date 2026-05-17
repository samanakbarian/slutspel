"""Remove SHL data (season_group_id=18263) from BigQuery — only HA data should be there."""
from google.cloud import bigquery

PROJECT = "granskaren-d51a1"
DATASET = "raw_sports"
c = bigquery.Client(project=PROJECT)

HA_IDS = [18266, 19979]  # HockeyAllsvenskan regular + playoff

tables = ["swehockey_player_stats", "swehockey_goalie_stats"]

for table in tables:
    fqn = f"{PROJECT}.{DATASET}.{table}"
    
    # Count before
    total = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}`"))[0].cnt
    ha_count = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}` WHERE season_group_id IN (18266, 19979)"))[0].cnt
    shl_count = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}` WHERE season_group_id NOT IN (18266, 19979)"))[0].cnt
    
    print(f"\n=== {table} ===")
    print(f"  Total: {total}")
    print(f"  HA rows (keep): {ha_count}")
    print(f"  SHL/other rows (remove): {shl_count}")
    
    if shl_count > 0:
        q = f"DELETE FROM `{fqn}` WHERE season_group_id NOT IN (18266, 19979)"
        c.query(q).result()
        new_total = list(c.query(f"SELECT COUNT(*) as cnt FROM `{fqn}`"))[0].cnt
        print(f"  Done: {total} -> {new_total} rows")

# Schedule and standings don't have season_group_id, check what's there
print("\n=== swehockey_standings ===")
for r in c.query(f"SELECT team_name, points, games_played FROM `{PROJECT}.{DATASET}.swehockey_standings` ORDER BY points DESC LIMIT 5"):
    print(f"  {r.team_name}: {r.points}p ({r.games_played} GP)")

# Check if standings have SHL teams
print("\nChecking for SHL teams in standings...")
shl_teams = ["Skellefteå", "Frölunda", "Luleå", "Malmö", "Växjö", "Linköping", "HV71", "Rögle", "Brynäs", "Djurgården", "Färjestad"]
for r in c.query(f"SELECT team_name FROM `{PROJECT}.{DATASET}.swehockey_standings`"):
    for shl in shl_teams:
        if shl.lower() in r.team_name.lower():
            print(f"  SHL team found: {r.team_name}")
            break

print("\nDone!")
