"""
Upload game events from local JSON files to BigQuery.
Parses goals and penalties from scraped Swehockey game pages.
"""
import os
import re
import json
from datetime import datetime, timezone
from google.cloud import bigquery

PROJECT_ID = "granskaren-d51a1"
DATASET = "raw_sports"
TABLE = "swehockey_game_events"
GAMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "swehockey", "games")

client = bigquery.Client(project=PROJECT_ID)

# Create table
SCHEMA = [
    bigquery.SchemaField("game_id", "INTEGER"),
    bigquery.SchemaField("event_type", "STRING"),       # goal / penalty / event
    bigquery.SchemaField("time", "STRING"),              # "58:25"
    bigquery.SchemaField("period", "INTEGER"),           # 1/2/3/4
    bigquery.SchemaField("team_code", "STRING"),         # "IFB"
    bigquery.SchemaField("player_number", "INTEGER"),
    bigquery.SchemaField("player_name", "STRING"),
    bigquery.SchemaField("detail", "STRING"),            # "PP1", "High Sticking", etc.
    bigquery.SchemaField("penalty_minutes", "INTEGER"),
    bigquery.SchemaField("assist1_name", "STRING"),
    bigquery.SchemaField("assist2_name", "STRING"),
    bigquery.SchemaField("home_team", "STRING"),
    bigquery.SchemaField("away_team", "STRING"),
    bigquery.SchemaField("score_state", "STRING"),       # "1-3"
    bigquery.SchemaField("is_power_play", "BOOLEAN"),
    bigquery.SchemaField("is_short_handed", "BOOLEAN"),
    bigquery.SchemaField("scraped_at", "TIMESTAMP"),
]

fqn = f"{PROJECT_ID}.{DATASET}.{TABLE}"
print(f"Dropping {TABLE}...")
client.delete_table(fqn, not_found_ok=True)
table = bigquery.Table(fqn, schema=SCHEMA)
client.create_table(table)
print(f"Created {TABLE} with {len(SCHEMA)} columns")

def time_to_period(time_str):
    """Convert match clock to period number."""
    try:
        parts = time_str.split(":")
        minutes = int(parts[0])
        if minutes <= 20:
            return 1
        elif minutes <= 40:
            return 2
        elif minutes <= 60:
            return 3
        else:
            return 4  # OT
    except:
        return 0

def parse_player_from_detail(detail_str):
    """Extract player number and name from event detail."""
    # Pattern: "44.\r\n    Lawner,\r\n    Oscar"
    detail = detail_str.replace("\r\n", " ").replace("\r", " ").strip()
    
    # Try: "NN. Lastname, Firstname"
    m = re.match(r'(\d+)\.\s*([^(]+)', detail)
    if m:
        number = int(m.group(1))
        name_raw = m.group(2).strip()
        # Clean up name
        name_raw = re.sub(r'\s+', ' ', name_raw).strip()
        # Remove trailing junk
        name_raw = re.split(r'(?:Pos\.|Neg\.|High |Hook|Trip|Hold|Slash|Cross|Board|Rough|Inter|Delay|Too )', name_raw)[0].strip()
        return number, name_raw
    return 0, ""

def parse_goal_assists(detail_str):
    """Parse assist names from goal detail."""
    detail = detail_str.replace("\r\n", " ").replace("\r", " ").strip()
    assists = []
    # Look for patterns like "(17)27.\n  Jakobsson,\n  Carl"
    # The primary scorer has a number followed by assist references
    parts = re.findall(r'(\d+)\.\s*([A-ZÅÄÖa-zåäö]+(?:,\s*[A-ZÅÄÖa-zåäö]+)?)', detail)
    # Skip the first one (scorer), take next two as assists
    for i, (num, name) in enumerate(parts):
        if i == 0:
            continue  # scorer
        name = re.sub(r'\s+', ' ', name).strip()
        if name and len(name) > 1:
            assists.append(name)
        if len(assists) >= 2:
            break
    return assists

def parse_penalty_type(detail_str):
    """Extract penalty type from detail."""
    detail = detail_str.replace("\r\n", " ").replace("\r", " ").strip()
    # Common patterns: "High Sticking(56:37 - 58:25)"
    types = ["High Sticking", "Hooking", "Tripping", "Holding", "Holding the stick",
             "Slashing", "Cross-Checking", "Boarding", "Roughing", "Interference",
             "Delay of Game", "Too Many Men", "Unsportsmanlike", "Charging", "Elbowing",
             "Closing hand on puck", "Broken stick"]
    for t in types:
        if t.lower() in detail.lower():
            return t
    return detail[:50] if detail else ""

now = datetime.now(timezone.utc).isoformat()
all_rows = []
files = sorted(os.listdir(GAMES_DIR))
print(f"\nProcessing {len(files)} game files...")

for fname in files:
    if not fname.endswith(".json"):
        continue
    with open(os.path.join(GAMES_DIR, fname), "r", encoding="utf-8") as f:
        game = json.load(f)
    
    game_id = game.get("game_id", int(fname.replace(".json", "")))
    sched = game.get("schedule_info", {})
    home_team = sched.get("home_team", "")
    away_team = sched.get("away_team", "")
    
    for ev in game.get("events", []):
        ev_type = ev.get("type", "event")
        time_str = ev.get("time", "")
        detail = ev.get("details", "")
        raw = ev.get("raw", [])
        
        period = time_to_period(time_str)
        
        # Extract team code from raw
        team_code = ""
        if len(raw) >= 3:
            team_code = str(raw[2]).strip()
        
        player_num = 0
        player_name = ""
        penalty_mins = 0
        assist1 = ""
        assist2 = ""
        score_state = ""
        is_pp = False
        is_sh = False
        penalty_type = ""
        
        if ev_type == "goal":
            # Parse scorer
            if len(raw) >= 4:
                player_num, player_name = parse_player_from_detail(str(raw[3]))
            # Score state
            if len(raw) >= 2:
                score_state = str(raw[1]).strip()
                is_pp = "PP" in score_state
                is_sh = "SH" in score_state
            # Assists
            if len(raw) >= 4:
                assists = parse_goal_assists(str(raw[3]))
                if assists:
                    assist1 = assists[0]
                if len(assists) > 1:
                    assist2 = assists[1]
        
        elif ev_type == "penalty":
            if len(raw) >= 4:
                player_num, player_name = parse_player_from_detail(str(raw[3]))
            # Extract penalty minutes
            if len(raw) >= 2:
                m = re.match(r'(\d+)\s*min', str(raw[1]))
                if m:
                    penalty_mins = int(m.group(1))
            # Extract penalty type
            if len(raw) >= 5:
                penalty_type = parse_penalty_type(str(raw[4]))
            elif len(raw) >= 4:
                penalty_type = parse_penalty_type(str(raw[3]))
        
        all_rows.append({
            "game_id": game_id,
            "event_type": ev_type,
            "time": time_str,
            "period": period,
            "team_code": team_code,
            "player_number": player_num,
            "player_name": player_name,
            "detail": penalty_type if ev_type == "penalty" else score_state,
            "penalty_minutes": penalty_mins,
            "assist1_name": assist1,
            "assist2_name": assist2,
            "home_team": home_team,
            "away_team": away_team,
            "score_state": score_state,
            "is_power_play": is_pp,
            "is_short_handed": is_sh,
            "scraped_at": now,
        })

print(f"Parsed {len(all_rows)} events from {len(files)} games")

# Count by type
types = {}
for r in all_rows:
    t = r["event_type"]
    types[t] = types.get(t, 0) + 1
print(f"  By type: {types}")

# Sample goals
goals = [r for r in all_rows if r["event_type"] == "goal"]
print(f"\nSample goals:")
for g in goals[:3]:
    print(f"  {g['time']} {g['team_code']} #{g['player_number']} {g['player_name']} ({g['detail']}) A1:{g['assist1_name']} A2:{g['assist2_name']}")

# Upload
errors = client.insert_rows_json(fqn, all_rows)
if errors:
    print(f"\nErrors: {errors[:2]}")
else:
    print(f"\nUploaded {len(all_rows)} events to {TABLE}")
