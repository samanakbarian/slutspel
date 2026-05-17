"""Quick verification of BigQuery data."""
from google.cloud import bigquery
c = bigquery.Client(project="granskaren-d51a1")

# Check goalies for IFB
print("=== IFB Goalies ===")
q = "SELECT goalie_name, team_code, games_played, save_pct FROM `granskaren-d51a1.raw_sports.swehockey_goalie_stats` WHERE LOWER(team_code) = 'ifb' ORDER BY games_played DESC"
for r in c.query(q).result():
    print(f"  {r.goalie_name}: team={r.team_code} gp={r.games_played} sv%={r.save_pct}")

print("\n=== All Goalies (top 5) ===")
q2 = "SELECT goalie_name, team_code, games_played, save_pct FROM `granskaren-d51a1.raw_sports.swehockey_goalie_stats` WHERE source = 'swehockey_scraper' ORDER BY save_pct DESC LIMIT 5"
for r in c.query(q2).result():
    print(f"  {r.goalie_name}: team={r.team_code} gp={r.games_played} sv%={r.save_pct}")

print("\n=== Standings (top 5) ===")
q3 = "SELECT rank, team_name, points, wins, losses, goal_diff FROM `granskaren-d51a1.raw_sports.swehockey_standings` WHERE source = 'swehockey_scraper' ORDER BY rank LIMIT 5"
for r in c.query(q3).result():
    print(f"  {r.rank}. {r.team_name}: {r.points}p ({r.wins}V-{r.losses}F) GD:{r.goal_diff}")
