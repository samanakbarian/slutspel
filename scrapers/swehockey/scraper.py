"""
Swehockey Stats Scraper — Björklöven Historisk Data
====================================================
Scrapes stats.swehockey.se for complete season data:
- Schedule & results (all games)
- Player stats (skaters + goalies) 
- Game events (goals, penalties, shots per period)

Usage:
    python scrapers/swehockey/scraper.py

Output is saved to data/swehockey/ as JSON files.
"""

import json
import os
import re
import time
import sys
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://stats.swehockey.se"
TEAM_FILTER_PATTERNS = ["björklöven", "bjorkloven", "if björklöven", "ifb"]

TOURNAMENTS = {
    "ha_regular_2526": {
        "id": 18266,
        "name": "HockeyAllsvenskan Grundserie 2025/26",
        "type": "regular"
    },
    "ha_playoff_2526": {
        "id": 19979,
        "name": "HockeyAllsvenskan Slutspel 2025/26",
        "type": "playoff"
    }
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "swehockey")
REQUEST_DELAY = 1.5  # seconds between requests

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
})


def fetch(url: str) -> BeautifulSoup:
    """Fetch a URL and return parsed BeautifulSoup, respecting rate limits."""
    time.sleep(REQUEST_DELAY)
    print(f"  -> GET {url}")
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return BeautifulSoup(resp.text, "html.parser")


def _int(val) -> int:
    """Safely parse int from string."""
    try:
        cleaned = re.sub(r'[^\d-]', '', str(val or ""))
        return int(cleaned) if cleaned else 0
    except (ValueError, TypeError):
        return 0


def _float(val) -> float:
    """Safely parse float from string."""
    try:
        cleaned = str(val or "").replace(",", ".").strip()
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0


def is_bjorkloven(text: str) -> bool:
    """Check if text mentions Bjorkloven."""
    t = (text or "").strip().lower()
    # Exact match for abbreviation
    if t == "ifb":
        return True
    # Substring match for full names
    return any(p in t for p in ["björklöven", "bjorkloven", "if björklöven"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# =====================================================================
# 1. SCHEDULE SCRAPER
# =====================================================================

def scrape_schedule(tournament_id: int) -> list[dict]:
    """Scrape all games from a tournament schedule page.
    
    The swehockey schedule HTML has a specific structure:
    - Each row has 8 <td> columns
    - Column 0: date (only on first game of that date, otherwise time)
    - Column 1: date+time combined (only when col0 has date) or empty
    - Column 2: time
    - Column 3: "Home Team \\xa0-\\xa0 Away Team" (with newlines/whitespace)
    - Column 4: result link e.g. "3 - 1"  (links to /Game/Events/{GameID})
    - Column 5: period results
    - Column 6: spectators
    - Column 7: venue
    """
    url = f"{BASE_URL}/ScheduleAndResults/Schedule/{tournament_id}"
    soup = fetch(url)
    games = []
    current_date = ""

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 5:
            continue

        # Extract GameID from onclick link
        game_id = None
        for cell in cells:
            for link in cell.find_all("a"):
                onclick = link.get("onclick", "")
                href = link.get("href", "")
                m = re.search(r"/Game/Events/(\d+)", onclick + href)
                if m:
                    game_id = int(m.group(1))
                    break
            if game_id:
                break

        if not game_id:
            continue

        # Extract cell texts
        raw = [c.get_text(" ", strip=False) for c in cells]
        texts = [c.get_text(strip=True) for c in cells]

        # Parse date - if col0 looks like a date (YYYY-MM-DD)
        col0 = texts[0]
        if re.match(r'\d{4}-\d{2}-\d{2}', col0):
            current_date = col0[:10]

        # Parse time from col2
        time_str = texts[2] if len(texts) > 2 else ""

        # Parse teams from col3 - format: "Home Team \xa0-\xa0 Away Team"
        teams_raw = raw[3] if len(raw) > 3 else ""
        # Split on \xa0-\xa0 (non-breaking space dash non-breaking space)
        team_parts = re.split(r'\xa0-\xa0|\s+-\s+', teams_raw)
        home_team = team_parts[0].strip() if len(team_parts) > 0 else ""
        away_team = team_parts[1].strip() if len(team_parts) > 1 else ""
        # Clean up whitespace/newlines
        home_team = re.sub(r'\s+', ' ', home_team).strip()
        away_team = re.sub(r'\s+', ' ', away_team).strip()

        # Parse result from col4
        result = texts[4] if len(texts) > 4 else ""
        result = re.sub(r'\xa0', ' ', result).strip()

        # Parse period results from col5
        period_results = texts[5] if len(texts) > 5 else ""

        # Parse spectators from col6
        spec_str = texts[6] if len(texts) > 6 else ""
        spectators = _int(spec_str) if spec_str else None

        # Parse venue from col7
        venue = texts[7] if len(texts) > 7 else ""

        games.append({
            "game_id": game_id,
            "tournament_id": tournament_id,
            "date": current_date,
            "time": time_str,
            "home_team": home_team,
            "away_team": away_team,
            "result": result,
            "period_results": period_results,
            "spectators": spectators,
            "venue": venue,
        })

    print(f"  OK Found {len(games)} games in tournament {tournament_id}")
    return games


# =====================================================================
# 2. GAME EVENTS SCRAPER
# =====================================================================

def scrape_game_events(game_id: int) -> dict:
    """Scrape detailed game events (goals, penalties, shots)."""
    url = f"{BASE_URL}/Game/Events/{game_id}"
    soup = fetch(url)
    
    result = {
        "game_id": game_id,
        "url": url,
        "events": [],
        "period_shots": [],
        "scraped_at": now_iso(),
    }

    # Parse game header
    header = soup.find("h2")
    if header:
        result["header"] = header.get_text(strip=True)

    # Parse all events from table rows
    current_section = ""
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        
        # Check for section headers  
        for cell in cells:
            if cell.get("class") and "tdSubTitle" in " ".join(cell.get("class", [])):
                current_section = cell.get_text(strip=True)
                break
            # Also check h3/h2/strong tags within cells
            for h in cell.find_all(["h3", "h2", "strong"]):
                txt = h.get_text(strip=True)
                if txt and len(txt) > 2:
                    current_section = txt

        if len(cells) < 3:
            continue

        texts = [c.get_text(strip=True) for c in cells]
        
        # Skip obvious header/empty rows
        if not texts[0] or texts[0].lower() in ["time", "tid", "rk", "#", "nr"]:
            continue
        
        # Try to classify event row based on content
        event = {
            "section": current_section,
            "raw": texts,
        }

        # Goal pattern: time | score "X - Y" | team | player(s)
        score_match = re.search(r'(\d+)\s*-\s*(\d+)', " ".join(texts[:3]))
        time_match = re.match(r'(\d{1,2}:\d{2})', texts[0])
        
        if time_match and score_match:
            event["type"] = "goal"
            event["time"] = texts[0]
            event["score"] = score_match.group(0)
            # Extract player names from remaining cells
            player_text = " ".join(texts[2:]).strip()
            event["details"] = player_text
        elif time_match and any(kw in " ".join(texts).lower() for kw in ["min", "utv", "penalty"]):
            event["type"] = "penalty"
            event["time"] = texts[0]
            event["details"] = " ".join(texts[1:]).strip()
        elif time_match:
            event["type"] = "event"
            event["time"] = texts[0]
            event["details"] = " ".join(texts[1:]).strip()
        else:
            continue

        result["events"].append(event)

    # Summary counts
    goals = [e for e in result["events"] if e.get("type") == "goal"]
    penalties = [e for e in result["events"] if e.get("type") == "penalty"]
    result["summary"] = {
        "goals": len(goals),
        "penalties": len(penalties),
        "total_events": len(result["events"]),
    }

    return result


# =====================================================================
# 3. PLAYER STATS SCRAPER
# =====================================================================

def scrape_player_stats(tournament_id: int) -> dict:
    """Scrape player scoring leaders and goalie stats for a tournament."""
    
    # --- Skaters ---
    skaters = _scrape_skater_table(tournament_id)
    
    # --- Goalies ---
    goalies = _scrape_goalie_table(tournament_id)

    print(f"  OK Scraped {len(skaters)} skaters, {len(goalies)} goalies")
    return {
        "tournament_id": tournament_id,
        "skaters": skaters,
        "goalies": goalies,
        "scraped_at": now_iso(),
    }


def _scrape_skater_table(tournament_id: int) -> list[dict]:
    """Scrape all skater stats pages (handles pagination)."""
    skaters = []
    page = 1
    while True:
        if page == 1:
            url = f"{BASE_URL}/Players/Statistics/ScoringLeaders/{tournament_id}"
        else:
            url = f"{BASE_URL}/Players/Statistics/ScoringLeaders/{tournament_id}?page={page}"
        
        soup = fetch(url)
        rows_found = 0

        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 9:
                continue
            
            texts = [c.get_text(strip=True) for c in cells]
            
            # Skip header rows and empty rows
            if texts[0].lower() in ["rk", "rank", "#", ""] or not texts[2]:
                continue
            
            # Detect if this is a player row (first col should be numeric rank)
            if not texts[0].isdigit():
                continue

            skater = {
                "rank": _int(texts[0]),
                "number": _int(texts[1]),
                "name": texts[2],
                "team": texts[3],
                "position": texts[4] if len(texts) > 4 else "",
                "gp": _int(texts[5]) if len(texts) > 5 else 0,
                "goals": _int(texts[6]) if len(texts) > 6 else 0,
                "assists": _int(texts[7]) if len(texts) > 7 else 0,
                "points": _int(texts[8]) if len(texts) > 8 else 0,
                "avg": texts[9] if len(texts) > 9 else "",
                "pim": _int(texts[10]) if len(texts) > 10 else 0,
                "plus_minus": texts[11] if len(texts) > 11 else "",
            }
            skaters.append(skater)
            rows_found += 1

        # If no rows found on this page, we've reached the end
        if rows_found == 0:
            break
        
        # Check if there's a "next page" link
        next_link = soup.find("a", string=re.compile(r"Next|Nästa|>>|>"))
        if not next_link:
            break
        
        page += 1
        if page > 50:  # safety limit
            break

    return skaters


def _scrape_goalie_table(tournament_id: int) -> list[dict]:
    """Scrape goalie stats."""
    url = f"{BASE_URL}/Players/Statistics/LeadingGoaliesSVS/{tournament_id}"
    soup = fetch(url)
    goalies = []

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 8:
            continue
        
        texts = [c.get_text(strip=True) for c in cells]
        
        if texts[0].lower() in ["rk", "rank", "#", ""] or not texts[2]:
            continue
        if not texts[0].isdigit():
            continue
        
        goalie = {
            "rank": _int(texts[0]),
            "number": _int(texts[1]),
            "name": texts[2],
            "team": texts[3],
            "gp": _int(texts[4]) if len(texts) > 4 else 0,
            "gpi": _int(texts[5]) if len(texts) > 5 else 0,
            "mip": texts[6] if len(texts) > 6 else "",
            "sog": _int(texts[7]) if len(texts) > 7 else 0,
            "ga": _int(texts[8]) if len(texts) > 8 else 0,
            "gaa": texts[9] if len(texts) > 9 else "",
            "svs": _int(texts[10]) if len(texts) > 10 else 0,
            "svs_pct": texts[11] if len(texts) > 11 else "",
            "so": _int(texts[12]) if len(texts) > 12 else 0,
            "wins": _int(texts[13]) if len(texts) > 13 else 0,
            "losses": _int(texts[14]) if len(texts) > 14 else 0,
            "win_pct": texts[15] if len(texts) > 15 else "",
        }
        goalies.append(goalie)

    return goalies


# =====================================================================
# 4. ORCHESTRATOR
# =====================================================================

def run_full_scrape():
    """Run complete historical scrape for all configured tournaments."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "games"), exist_ok=True)

    all_bjorkloven_games = []
    all_player_stats = {}

    for key, tournament in TOURNAMENTS.items():
        tid = tournament["id"]
        print(f"\n{'='*60}")
        print(f"  Scraping: {tournament['name']} (ID: {tid})")
        print(f"{'='*60}")

        # 1. Schedule
        print(f"\n[1/3] Hamtar matchschema...")
        schedule = scrape_schedule(tid)
        save_json(schedule, f"schedule_{key}.json")

        # Filter Bjorkloven games
        bjk_games = [g for g in schedule if is_bjorkloven(g["home_team"]) or is_bjorkloven(g["away_team"])]
        print(f"  -> {len(bjk_games)} Bjorkloven-matcher av {len(schedule)} totalt")
        all_bjorkloven_games.extend(bjk_games)

        # 2. Player stats
        print(f"\n[2/3] Hamtar spelarstatistik...")
        stats = scrape_player_stats(tid)
        all_player_stats[key] = stats
        
        # Filter Bjorkloven players
        bjk_skaters = [s for s in stats["skaters"] if is_bjorkloven(s["team"])]
        bjk_goalies = [g for g in stats["goalies"] if is_bjorkloven(g["team"])]
        stats["bjorkloven_skaters"] = bjk_skaters
        stats["bjorkloven_goalies"] = bjk_goalies
        save_json(stats, f"player_stats_{key}.json")
        print(f"  -> Bjorkloven: {len(bjk_skaters)} skaters, {len(bjk_goalies)} goalies")

        # 3. Game events for each Bjorkloven match
        print(f"\n[3/3] Hamtar matchhandelser ({len(bjk_games)} matcher)...")
        for i, game in enumerate(bjk_games):
            gid = game["game_id"]
            game_file = os.path.join("games", f"{gid}.json")
            full_path = os.path.join(OUTPUT_DIR, game_file)
            
            if os.path.exists(full_path):
                print(f"  [{i+1}/{len(bjk_games)}] Skippar {gid} (redan hamtad)")
                continue
            
            home = game['home_team'][:20]
            away = game['away_team'][:20]
            print(f"  [{i+1}/{len(bjk_games)}] Hamtar match {gid}: {home} vs {away}")
            try:
                events = scrape_game_events(gid)
                events["schedule_info"] = game
                save_json(events, game_file)
            except Exception as e:
                print(f"  !! Kunde inte hamta {gid}: {e}")

    # Save combined Bjorkloven summary
    summary = {
        "team": "IF Bjorkloven",
        "season": "2025/26",
        "league": "HockeyAllsvenskan",
        "total_games": len(all_bjorkloven_games),
        "tournaments": list(TOURNAMENTS.keys()),
        "games": all_bjorkloven_games,
        "player_stats": {},
        "scraped_at": now_iso(),
    }
    
    # Add player stats per tournament
    for key, stats in all_player_stats.items():
        summary["player_stats"][key] = {
            "skaters": stats.get("bjorkloven_skaters", []),
            "goalies": stats.get("bjorkloven_goalies", []),
        }

    save_json(summary, "bjorkloven_season_2526.json")

    print(f"\n{'='*60}")
    print(f"  KLAR! Scrapad data sparad i {OUTPUT_DIR}")
    print(f"  * {len(all_bjorkloven_games)} Bjorkloven-matcher")
    for k, v in all_player_stats.items():
        bjk_s = len(v.get("bjorkloven_skaters", []))
        bjk_g = len(v.get("bjorkloven_goalies", []))
        print(f"  * {k}: {bjk_s} Bjorkloven skaters, {bjk_g} goalies (av {len(v['skaters'])} / {len(v['goalies'])} totalt)")
    print(f"{'='*60}")


def save_json(data, filename: str):
    """Save data as formatted JSON."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  >> Saved: {filepath}")


if __name__ == "__main__":
    print("Swehockey Scraper - Bjorkloven Historisk Data")
    print(f"   Output: {OUTPUT_DIR}")
    print(f"   Request delay: {REQUEST_DELAY}s")
    run_full_scrape()
