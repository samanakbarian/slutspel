"""
BigQuery Loader — Load scraped Swehockey data into BigQuery
============================================================
Loads JSON files from data/swehockey/ into the existing 
raw_sports BigQuery tables with the correct schema.

Tables populated:
  - raw_sports.swehockey_player_stats
  - raw_sports.swehockey_goalie_stats  
  - raw_sports.swehockey_schedule
  - raw_sports.swehockey_standings (computed from schedule)

Usage:
    python scrapers/swehockey/bq_loader.py
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

from google.cloud import bigquery

PROJECT_ID = "granskaren-d51a1"
DATASET = "raw_sports"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "swehockey")

# Tournament IDs
TOURNAMENT_REGULAR = 18266
TOURNAMENT_PLAYOFF = 19979


def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  !! File not found: {filepath}")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_int(val):
    try:
        return int(re.sub(r'[^\d-]', '', str(val or "0")))
    except (ValueError, TypeError):
        return 0


def safe_float(val):
    try:
        return float(str(val or "0").replace(",", "."))
    except (ValueError, TypeError):
        return 0.0


def build_player_stats_rows(stats_data, tournament_id):
    """Transform scraped skater data into BigQuery rows."""
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    
    for s in stats_data.get("skaters", []):
        rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tournament_id,
            "team_id": 0,
            "team_code": s.get("team", ""),
            "player_name": s.get("name", ""),
            "jersey_number": safe_int(s.get("number")),
            "position": s.get("position", ""),
            "games_played": safe_int(s.get("gp")),
            "goals": safe_int(s.get("goals")),
            "assists": safe_int(s.get("assists")),
            "points": safe_int(s.get("points")),
            "pim": safe_int(s.get("pim")),
            "plus_minus": safe_int(s.get("plus_minus", "0").replace("+", "")),
            "scraped_at": now,
        })
    return rows


def build_goalie_stats_rows(stats_data, tournament_id):
    """Transform scraped goalie data into BigQuery rows."""
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    
    for g in stats_data.get("goalies", []):
        rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tournament_id,
            "team_id": 0,
            "team_code": g.get("team", ""),
            "goalie_name": g.get("name", ""),
            "games_played": safe_int(g.get("gp")),
            "toi_minutes": 0,  # Not available from summary page
            "shots_against": safe_int(g.get("sog")),
            "goals_against": safe_int(g.get("ga")),
            "saves": safe_int(g.get("svs")),
            "save_pct": safe_float(g.get("svs_pct")),
            "gaa": safe_float(g.get("gaa")),
            "scraped_at": now,
        })
    return rows


def build_schedule_rows(season_data, tournament_id):
    """Transform scraped schedule data into BigQuery rows."""
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    
    for g in season_data.get("games", []):
        result_str = (g.get("result", "") or "").replace("\xa0", " ").strip()
        rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tournament_id,
            "team_id": 0,
            "home_team": g.get("home_team", ""),
            "away_team": g.get("away_team", ""),
            "match_date": g.get("date", ""),
            "result": result_str,
            "status": "played" if result_str else "scheduled",
            "scraped_at": now,
        })
    return rows


def build_standings_rows(season_data, schedule_data, tournament_id):
    """Compute standings from schedule data."""
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    
    # Build team records from all games
    teams = {}
    all_games = schedule_data if isinstance(schedule_data, list) else []
    
    for g in all_games:
        home = g.get("home_team", "")
        away = g.get("away_team", "")
        result_str = (g.get("result", "") or "").replace("\xa0", " ")
        period_str = g.get("period_results", "")
        
        match = re.search(r'(\d+)\s*-\s*(\d+)', result_str)
        if not match or not home or not away:
            continue
            
        home_goals = int(match.group(1))
        away_goals = int(match.group(2))
        
        # Detect OT/SO
        is_ot = any(kw in (period_str or "").upper() for kw in ["ÖT", "OT", "SO", "GWS"])
        
        for team_name in [home, away]:
            if team_name not in teams:
                teams[team_name] = {"gp": 0, "w": 0, "l": 0, "otw": 0, "otl": 0, "gf": 0, "ga": 0}
            
            t = teams[team_name]
            t["gp"] += 1
            
            if team_name == home:
                t["gf"] += home_goals
                t["ga"] += away_goals
                if home_goals > away_goals:
                    if is_ot:
                        t["otw"] += 1
                    else:
                        t["w"] += 1
                else:
                    if is_ot:
                        t["otl"] += 1
                    else:
                        t["l"] += 1
            else:
                t["gf"] += away_goals
                t["ga"] += home_goals
                if away_goals > home_goals:
                    if is_ot:
                        t["otw"] += 1
                    else:
                        t["w"] += 1
                else:
                    if is_ot:
                        t["otl"] += 1
                    else:
                        t["l"] += 1
    
    # Calculate points and rank
    team_list = []
    for name, stats in teams.items():
        points = stats["w"] * 3 + stats["otw"] * 2 + stats["otl"] * 1
        goal_diff = stats["gf"] - stats["ga"]
        team_list.append({
            "team_name": name,
            "games_played": stats["gp"],
            "wins": stats["w"],
            "ot_wins": stats["otw"],
            "ot_losses": stats["otl"],
            "losses": stats["l"],
            "points": points,
            "goal_diff": goal_diff,
        })
    
    # Sort by points (desc), then goal diff (desc)
    team_list.sort(key=lambda t: (t["points"], t["goal_diff"]), reverse=True)
    
    for rank, t in enumerate(team_list, 1):
        rows.append({
            "source": "swehockey_scraper",
            "season_group_id": tournament_id,
            "rank": rank,
            "team_name": t["team_name"],
            "games_played": t["games_played"],
            "wins": t["wins"],
            "ot_wins": t["ot_wins"],
            "ot_losses": t["ot_losses"],
            "losses": t["losses"],
            "points": t["points"],
            "goal_diff": t["goal_diff"],
            "scraped_at": now,
        })
    
    return rows


def upload_to_bigquery(table_id, rows):
    """Upload rows to BigQuery, appending to existing data."""
    if not rows:
        print(f"  -- No data for {table_id}")
        return
    
    client = bigquery.Client(project=PROJECT_ID)
    full_table_id = f"{PROJECT_ID}.{DATASET}.{table_id}"
    
    # Delete existing rows from same source to avoid duplicates
    delete_query = f"""
    DELETE FROM `{full_table_id}` 
    WHERE source = 'swehockey_scraper'
    """
    try:
        client.query(delete_query).result()
        print(f"  -> Cleaned old scraper data from {table_id}")
    except Exception as e:
        print(f"  !! Could not clean {table_id}: {e}")
    
    # Insert new rows
    errors = client.insert_rows_json(full_table_id, rows)
    if errors:
        print(f"  !! BigQuery insert errors for {table_id}: {errors[:3]}")
    else:
        print(f"  OK Loaded {len(rows)} rows into {table_id}")


def main():
    print("BigQuery Loader - Swehockey Data")
    print(f"  Project: {PROJECT_ID}")
    print(f"  Dataset: {DATASET}")
    print(f"  Data dir: {DATA_DIR}")
    print()

    # 1. Player stats
    print("[1/4] Loading player stats...")
    regular_stats = load_json("player_stats_ha_regular_2526.json")
    playoff_stats = load_json("player_stats_ha_playoff_2526.json")
    
    player_rows = []
    if regular_stats:
        player_rows += build_player_stats_rows(regular_stats, TOURNAMENT_REGULAR)
    if playoff_stats:
        player_rows += build_player_stats_rows(playoff_stats, TOURNAMENT_PLAYOFF)
    upload_to_bigquery("swehockey_player_stats", player_rows)

    # 2. Goalie stats
    print("\n[2/4] Loading goalie stats...")
    goalie_rows = []
    if regular_stats:
        goalie_rows += build_goalie_stats_rows(regular_stats, TOURNAMENT_REGULAR)
    if playoff_stats:
        goalie_rows += build_goalie_stats_rows(playoff_stats, TOURNAMENT_PLAYOFF)
    upload_to_bigquery("swehockey_goalie_stats", goalie_rows)

    # 3. Schedule (all Bjorkloven games)
    print("\n[3/4] Loading schedule...")
    schedule_regular = load_json("schedule_ha_regular_2526.json")
    schedule_rows = build_schedule_rows(
        {"games": schedule_regular or []}, TOURNAMENT_REGULAR
    )
    upload_to_bigquery("swehockey_schedule", schedule_rows)

    # 4. Standings (computed from full schedule)
    print("\n[4/4] Computing and loading standings...")
    standings_rows = build_standings_rows(
        None, schedule_regular or [], TOURNAMENT_REGULAR
    )
    upload_to_bigquery("swehockey_standings", standings_rows)

    print("\n" + "=" * 60)
    print("  BigQuery load complete!")
    print(f"  Player stats: {len(player_rows)} rows")
    print(f"  Goalie stats: {len(goalie_rows)} rows")
    print(f"  Schedule: {len(schedule_rows)} rows")
    print(f"  Standings: {len(standings_rows)} rows")
    print("=" * 60)


if __name__ == "__main__":
    main()
