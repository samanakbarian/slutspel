"""Explore BQ data model for planning."""
from google.cloud import bigquery
c = bigquery.Client(project="granskaren-d51a1")

# 1. dim_matches with period scores
print("=== BJK games from dim_matches (latest 3) ===")
rows = list(c.query("""
    SELECT match_date, home_team_name, away_team_name, home_score, away_score,
           match_status, stage, result_category, period_scores
    FROM `granskaren-d51a1.loven_staging_marts.dim_matches`
    WHERE home_team_name LIKE '%jorkloven%' OR away_team_name LIKE '%jorkloven%'
    ORDER BY match_date DESC LIMIT 3
"""))
for r in rows:
    d = dict(r.items())
    print(f"  {d['match_date']}: {d['home_team_name']} {d['home_score']}-{d['away_score']} {d['away_team_name']}")
    print(f"    status={d['match_status']}, stage={d['stage']}, cat={d['result_category']}")
    print(f"    period_scores={d['period_scores']}")
    print()

# 2. dim_seasons
print("=== dim_seasons ===")
for r in c.query("SELECT * FROM `granskaren-d51a1.loven_staging_marts.dim_seasons`"):
    print(f"  {dict(r.items())}")

# 3. Sportradar raw - what's in summaries?
print("\n=== raw_sportradar.summaries - sample match event data ===")
row = list(c.query("SELECT * FROM `granskaren-d51a1.raw_sportradar.summaries` WHERE sport_event_status.status = 'closed' LIMIT 1"))
if row:
    d = dict(row[0].items())
    se = d.get("sport_event", {})
    ses = d.get("sport_event_status", {})
    print(f"  competitors: {se.get('competitors', [])[:2]}")
    print(f"  status: {ses}")
    print(f"  period_scores: {ses.get('period_scores', [])}")

# 4. Swehockey schedule - sample with venue/spectators
print("\n=== swehockey_schedule - sample BJK game with venue ===")
for r in c.query("""
    SELECT match_date, home_team, away_team, result, period_results, spectators, venue
    FROM `granskaren-d51a1.raw_sports.swehockey_schedule`
    WHERE (home_team LIKE '%jörklöven%' OR away_team LIKE '%jörklöven%')
    ORDER BY match_date DESC LIMIT 3
"""):
    d = dict(r.items())
    print(f"  {d['match_date']}: {d['home_team']} vs {d['away_team']} = {d['result']}")
    print(f"    periods={d['period_results']}, spec={d['spectators']}, venue={d['venue']}")

# 5. Game events from local JSON
import os, json
games_dir = os.path.join("data", "swehockey", "games")
game_files = sorted(os.listdir(games_dir))[-1:]  # Latest game
for gf in game_files:
    with open(os.path.join(games_dir, gf), "r", encoding="utf-8") as f:
        gd = json.load(f)
    print(f"\n=== Game event sample: {gf} ===")
    print(f"  Header: {gd.get('header')}")
    print(f"  Events: {len(gd.get('events', []))}")
    for ev in gd.get("events", [])[:5]:
        print(f"    {ev.get('type')}: {ev.get('time')} - {ev.get('details', '')[:80]}")
    print(f"  Summary: {gd.get('summary')}")
