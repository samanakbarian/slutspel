"""Insert correct HA standings into BigQuery."""
import json, re
from collections import defaultdict
from datetime import datetime, timezone
from google.cloud import bigquery

c = bigquery.Client(project="granskaren-d51a1")
fqn = "granskaren-d51a1.raw_sports.swehockey_standings"

with open("data/swehockey/schedule_ha_regular_2526.json", "r", encoding="utf-8") as f:
    schedule = json.load(f)

teams = defaultdict(lambda: {"gp":0,"wins":0,"losses":0,"ot_wins":0,"ot_losses":0,"gf":0,"ga":0,"points":0})
for g in schedule:
    r = g.get("result", "")
    m = re.match(r"(\d+)\s*-\s*(\d+)", r)
    if not m:
        continue
    h, a = g["home_team"], g["away_team"]
    hg, ag = int(m.group(1)), int(m.group(2))
    is_ot = any(x in r for x in ["OT", "SO"])
    teams[h]["gp"] += 1
    teams[a]["gp"] += 1
    teams[h]["gf"] += hg
    teams[h]["ga"] += ag
    teams[a]["gf"] += ag
    teams[a]["ga"] += hg
    if hg > ag:
        if is_ot:
            teams[h]["ot_wins"] += 1
            teams[h]["points"] += 2
            teams[a]["ot_losses"] += 1
            teams[a]["points"] += 1
        else:
            teams[h]["wins"] += 1
            teams[h]["points"] += 3
            teams[a]["losses"] += 1
    elif ag > hg:
        if is_ot:
            teams[a]["ot_wins"] += 1
            teams[a]["points"] += 2
            teams[h]["ot_losses"] += 1
            teams[h]["points"] += 1
        else:
            teams[a]["wins"] += 1
            teams[a]["points"] += 3
            teams[h]["losses"] += 1

sorted_teams = sorted(teams.items(), key=lambda x: (-x[1]["points"], x[1]["gf"] - x[1]["ga"]))

now = datetime.now(timezone.utc).isoformat()
rows = []
for rank, (name, s) in enumerate(sorted_teams, 1):
    rows.append({
        "team_name": name,
        "games_played": s["gp"],
        "wins": s["wins"],
        "losses": s["losses"],
        "ot_wins": s["ot_wins"],
        "ot_losses": s["ot_losses"],
        "points": s["points"],
        "goal_diff": s["gf"] - s["ga"],
        "rank": rank,
        "source": "swehockey_scraper",
        "scraped_at": now,
        "season_group_id": 18266,
    })

print("Standings to insert:")
for r in rows:
    print(f"  #{r['rank']} {r['team_name']}: {r['points']}p ({r['wins']}V-{r['losses']}F, GD {r['goal_diff']:+d})")

errors = c.insert_rows_json(fqn, rows)
if errors:
    print(f"\nErrors: {errors}")
else:
    print(f"\nInserted {len(rows)} standings rows successfully!")

# Verify
print("\nVerification from BQ:")
for r in c.query(f"SELECT team_name, points, games_played, rank FROM `{fqn}` ORDER BY rank LIMIT 5"):
    print(f"  #{r.rank} {r.team_name}: {r.points}p ({r.games_played} GP)")
