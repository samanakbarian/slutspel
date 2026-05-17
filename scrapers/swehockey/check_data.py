"""Check what's in local JSON files vs BigQuery."""
import json

# Check local player stats
with open("data/swehockey/player_stats_ha_regular_2526.json", "r", encoding="utf-8") as f:
    d = json.load(f)

print("=== Local: player_stats_ha_regular_2526.json ===")
print(f"Tournament ID: {d.get('tournament_id')}")
print(f"Total skaters: {len(d.get('skaters', []))}")
print(f"Total goalies: {len(d.get('goalies', []))}")
print(f"BJK skaters: {len(d.get('bjorkloven_skaters', []))}")

teams = set(s['team'] for s in d.get('skaters', []))
print(f"Teams in data: {sorted(teams)}")
print(f"\nTop 5 skaters:")
for s in d.get('skaters', [])[:5]:
    print(f"  {s['name']} ({s['team']}) - {s['goals']}G {s['assists']}A {s['points']}P")

print(f"\nBJK skaters:")
for s in d.get('bjorkloven_skaters', []):
    print(f"  {s['name']} ({s['team']}) - {s['goals']}G {s['assists']}A {s['points']}P")

# Now check BigQuery
from google.cloud import bigquery
c = bigquery.Client(project="granskaren-d51a1")

print("\n=== BigQuery: swehockey_player_stats ===")
for r in c.query("SELECT DISTINCT season_group_id FROM `granskaren-d51a1.raw_sports.swehockey_player_stats`"):
    print(f"  season_group_id: {r.season_group_id}")

print("\nTeams in BQ:")
for r in c.query("SELECT DISTINCT team_code FROM `granskaren-d51a1.raw_sports.swehockey_player_stats` ORDER BY team_code"):
    print(f"  {r.team_code}")

print("\nTop 5 scorers in BQ:")
for r in c.query("SELECT player_name, team_code, season_group_id, goals, assists, points FROM `granskaren-d51a1.raw_sports.swehockey_player_stats` ORDER BY points DESC LIMIT 5"):
    print(f"  {r.player_name} ({r.team_code}) season={r.season_group_id} - {r.goals}G {r.assists}A {r.points}P")
