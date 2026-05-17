"""
Full reload: Drop+recreate BQ tables with complete schema, then re-upload all scraped data.
This fixes the issue where the original loader dropped many columns.
"""
import json
import os
import re
from datetime import datetime, timezone
from google.cloud import bigquery

PROJECT_ID = "granskaren-d51a1"
DATASET = "raw_sports"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "swehockey")

TOURNAMENT_REGULAR = 18266
TOURNAMENT_PLAYOFF = 19979

client = bigquery.Client(project=PROJECT_ID)

def safe_int(val):
    try:
        return int(re.sub(r'[^\d-]', '', str(val or "0")))
    except (ValueError, TypeError):
        return 0

def safe_float(val):
    try:
        return float(str(val or "0").replace(",", ".").strip())
    except (ValueError, TypeError):
        return 0.0

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"  !! Not found: {path}")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ── 1. Recreate tables with FULL schemas ──

PLAYER_SCHEMA = [
    bigquery.SchemaField("source", "STRING"),
    bigquery.SchemaField("season_group_id", "INTEGER"),
    bigquery.SchemaField("team_id", "INTEGER"),
    bigquery.SchemaField("team_code", "STRING"),
    bigquery.SchemaField("player_name", "STRING"),
    bigquery.SchemaField("jersey_number", "INTEGER"),
    bigquery.SchemaField("position", "STRING"),
    bigquery.SchemaField("games_played", "INTEGER"),
    bigquery.SchemaField("goals", "INTEGER"),
    bigquery.SchemaField("assists", "INTEGER"),
    bigquery.SchemaField("points", "INTEGER"),
    bigquery.SchemaField("avg_ppg", "FLOAT"),       # NEW: points per game
    bigquery.SchemaField("pim", "INTEGER"),
    bigquery.SchemaField("plus_minus", "STRING"),    # CHANGED: was INTEGER, now STRING (format "41:40")
    bigquery.SchemaField("scraped_at", "TIMESTAMP"),
]

GOALIE_SCHEMA = [
    bigquery.SchemaField("source", "STRING"),
    bigquery.SchemaField("season_group_id", "INTEGER"),
    bigquery.SchemaField("team_id", "INTEGER"),
    bigquery.SchemaField("team_code", "STRING"),
    bigquery.SchemaField("goalie_name", "STRING"),
    bigquery.SchemaField("jersey_number", "INTEGER"),  # NEW
    bigquery.SchemaField("games_played", "INTEGER"),
    bigquery.SchemaField("gpi", "INTEGER"),             # NEW: games played in
    bigquery.SchemaField("toi_minutes", "STRING"),      # CHANGED: was INTEGER, now STRING (format "1726:51")
    bigquery.SchemaField("shots_against", "INTEGER"),
    bigquery.SchemaField("goals_against", "INTEGER"),
    bigquery.SchemaField("saves", "INTEGER"),
    bigquery.SchemaField("save_pct", "FLOAT"),
    bigquery.SchemaField("gaa", "FLOAT"),
    bigquery.SchemaField("shutouts", "INTEGER"),         # NEW
    bigquery.SchemaField("wins", "INTEGER"),             # NEW
    bigquery.SchemaField("losses", "INTEGER"),           # NEW
    bigquery.SchemaField("win_pct", "FLOAT"),            # NEW
    bigquery.SchemaField("scraped_at", "TIMESTAMP"),
]

SCHEDULE_SCHEMA = [
    bigquery.SchemaField("source", "STRING"),
    bigquery.SchemaField("season_group_id", "INTEGER"),
    bigquery.SchemaField("team_id", "INTEGER"),
    bigquery.SchemaField("game_id", "INTEGER"),          # NEW
    bigquery.SchemaField("home_team", "STRING"),
    bigquery.SchemaField("away_team", "STRING"),
    bigquery.SchemaField("match_date", "STRING"),
    bigquery.SchemaField("match_time", "STRING"),        # NEW
    bigquery.SchemaField("result", "STRING"),
    bigquery.SchemaField("period_results", "STRING"),    # NEW
    bigquery.SchemaField("spectators", "INTEGER"),       # NEW
    bigquery.SchemaField("venue", "STRING"),             # NEW
    bigquery.SchemaField("status", "STRING"),
    bigquery.SchemaField("scraped_at", "TIMESTAMP"),
]

STANDINGS_SCHEMA = [
    bigquery.SchemaField("source", "STRING"),
    bigquery.SchemaField("season_group_id", "INTEGER"),
    bigquery.SchemaField("rank", "INTEGER"),
    bigquery.SchemaField("team_name", "STRING"),
    bigquery.SchemaField("games_played", "INTEGER"),
    bigquery.SchemaField("wins", "INTEGER"),
    bigquery.SchemaField("ot_wins", "INTEGER"),
    bigquery.SchemaField("ot_losses", "INTEGER"),
    bigquery.SchemaField("losses", "INTEGER"),
    bigquery.SchemaField("points", "INTEGER"),
    bigquery.SchemaField("goal_diff", "INTEGER"),
    bigquery.SchemaField("scraped_at", "TIMESTAMP"),
]

def recreate_table(table_name, schema):
    fqn = f"{PROJECT_ID}.{DATASET}.{table_name}"
    print(f"\n  Dropping {table_name}...")
    client.delete_table(fqn, not_found_ok=True)
    table = bigquery.Table(fqn, schema=schema)
    table = client.create_table(table)
    print(f"  Created {table_name} with {len(schema)} columns")

print("=" * 60)
print("  FULL RELOAD: Recreating BQ tables with complete schemas")
print("=" * 60)

recreate_table("swehockey_player_stats", PLAYER_SCHEMA)
recreate_table("swehockey_goalie_stats", GOALIE_SCHEMA)
recreate_table("swehockey_schedule", SCHEDULE_SCHEMA)
recreate_table("swehockey_standings", STANDINGS_SCHEMA)

# ── 2. Load data ──

now = datetime.now(timezone.utc).isoformat()

def upload(table_name, rows):
    if not rows:
        print(f"  -- No data for {table_name}")
        return
    fqn = f"{PROJECT_ID}.{DATASET}.{table_name}"
    errors = client.insert_rows_json(fqn, rows)
    if errors:
        print(f"  !! Errors for {table_name}: {errors[:2]}")
    else:
        print(f"  OK {table_name}: {len(rows)} rows")

# Players
print("\n[1/4] Loading player stats...")
player_rows = []
for fname, tid in [("player_stats_ha_regular_2526.json", TOURNAMENT_REGULAR),
                    ("player_stats_ha_playoff_2526.json", TOURNAMENT_PLAYOFF)]:
    data = load_json(fname)
    if not data:
        continue
    for s in data.get("skaters", []):
        # Parse plus_minus - keep as string since format is "41:40" or "+5" etc.
        pm_raw = str(s.get("plus_minus", "0"))
        player_rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tid,
            "team_id": 0,
            "team_code": s.get("team", ""),
            "player_name": s.get("name", ""),
            "jersey_number": safe_int(s.get("number")),
            "position": s.get("position", ""),
            "games_played": safe_int(s.get("gp")),
            "goals": safe_int(s.get("goals")),
            "assists": safe_int(s.get("assists")),
            "points": safe_int(s.get("points")),
            "avg_ppg": safe_float(s.get("avg")),
            "pim": safe_int(s.get("pim")),
            "plus_minus": pm_raw,
            "scraped_at": now,
        })
    print(f"  Loaded {len(data.get('skaters', []))} skaters from {fname}")
upload("swehockey_player_stats", player_rows)

# Goalies
print("\n[2/4] Loading goalie stats...")
goalie_rows = []
for fname, tid in [("player_stats_ha_regular_2526.json", TOURNAMENT_REGULAR),
                    ("player_stats_ha_playoff_2526.json", TOURNAMENT_PLAYOFF)]:
    data = load_json(fname)
    if not data:
        continue
    for g in data.get("goalies", []):
        goalie_rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tid,
            "team_id": 0,
            "team_code": g.get("team", ""),
            "goalie_name": g.get("name", ""),
            "jersey_number": safe_int(g.get("number")),
            "games_played": safe_int(g.get("gp")),
            "gpi": safe_int(g.get("gpi")),
            "toi_minutes": str(g.get("mip", "")),
            "shots_against": safe_int(g.get("sog")),
            "goals_against": safe_int(g.get("ga")),
            "saves": safe_int(g.get("svs")),
            "save_pct": safe_float(g.get("svs_pct")),
            "gaa": safe_float(g.get("gaa")),
            "shutouts": safe_int(g.get("so")),
            "wins": safe_int(g.get("wins")),
            "losses": safe_int(g.get("losses")),
            "win_pct": safe_float(g.get("win_pct")),
            "scraped_at": now,
        })
    print(f"  Loaded {len(data.get('goalies', []))} goalies from {fname}")
upload("swehockey_goalie_stats", goalie_rows)

# Schedule — load full schedule, not just BJK games
print("\n[3/4] Loading schedule...")
schedule_rows = []
schedule_data = load_json("schedule_ha_regular_2526.json")
if schedule_data:
    for g in schedule_data:
        result_str = (g.get("result", "") or "").replace("\xa0", " ").strip()
        schedule_rows.append({
            "source": "swehockey_scraper",
            "season_group_id": TOURNAMENT_REGULAR,
            "team_id": 0,
            "game_id": safe_int(g.get("game_id")),
            "home_team": g.get("home_team", ""),
            "away_team": g.get("away_team", ""),
            "match_date": g.get("date", ""),
            "match_time": g.get("time", ""),
            "result": result_str,
            "period_results": g.get("period_results", ""),
            "spectators": safe_int(g.get("spectators")) if g.get("spectators") else None,
            "venue": g.get("venue", ""),
            "status": "played" if result_str else "scheduled",
            "scraped_at": now,
        })
    print(f"  Loaded {len(schedule_rows)} games")
upload("swehockey_schedule", schedule_rows)

# Standings
print("\n[4/4] Computing standings...")
teams = {}
for g in (schedule_data or []):
    home = g.get("home_team", "")
    away = g.get("away_team", "")
    result_str = (g.get("result", "") or "").replace("\xa0", " ")
    match = re.search(r'(\d+)\s*-\s*(\d+)', result_str)
    if not match or not home or not away:
        continue
    hg, ag = int(match.group(1)), int(match.group(2))
    period_str = g.get("period_results", "")
    is_ot = any(kw in (period_str or "").upper() for kw in ["ÖT", "OT", "SO", "GWS"])
    for tn in [home, away]:
        if tn not in teams:
            teams[tn] = {"gp": 0, "w": 0, "l": 0, "otw": 0, "otl": 0, "gf": 0, "ga": 0}
        t = teams[tn]
        t["gp"] += 1
        is_home = tn == home
        t["gf"] += hg if is_home else ag
        t["ga"] += ag if is_home else hg
        won = (hg > ag) if is_home else (ag > hg)
        if won:
            t["otw" if is_ot else "w"] += 1
        else:
            t["otl" if is_ot else "l"] += 1

standings_rows = []
team_list = sorted(teams.items(), key=lambda x: (-(x[1]["w"]*3 + x[1]["otw"]*2 + x[1]["otl"]), -(x[1]["gf"]-x[1]["ga"])))
for rank, (name, s) in enumerate(team_list, 1):
    pts = s["w"]*3 + s["otw"]*2 + s["otl"]
    standings_rows.append({
        "source": "swehockey_scraper",
        "season_group_id": TOURNAMENT_REGULAR,
        "rank": rank,
        "team_name": name,
        "games_played": s["gp"],
        "wins": s["w"],
        "ot_wins": s["otw"],
        "ot_losses": s["otl"],
        "losses": s["l"],
        "points": pts,
        "goal_diff": s["gf"] - s["ga"],
        "scraped_at": now,
    })
    print(f"  #{rank} {name}: {pts}p")
upload("swehockey_standings", standings_rows)

print("\n" + "=" * 60)
print(f"  DONE! Uploaded:")
print(f"    Players:   {len(player_rows)}")
print(f"    Goalies:   {len(goalie_rows)}")
print(f"    Schedule:  {len(schedule_rows)}")
print(f"    Standings: {len(standings_rows)}")
print("=" * 60)
