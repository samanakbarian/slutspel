# Swehockey Data Coverage Matrix

Updated: 2026-05-19

## Purpose
This document shows:
- what data we already ingest from Swehockey Stats
- what data we expose in API
- what data we can add next
- quality checks to prevent empty production views

## 1) Data Ingested Today

### 1.1 Player Stats
- Source URLs:
  - `/Teams/Info/PlayersByTeam/{team_id}`
  - fallback: `/Players/Statistics/ScoringLeaders/{season_group_id}`
- BigQuery table: `raw_sports.swehockey_player_stats`
- Main fields:
  - `player_name`, `team_code`, `position`, `jersey_number`
  - `games_played`, `goals`, `assists`, `points`, `plus_minus`, `pim`
  - `season_group_id`, `team_id`, `scraped_at`, `source`

### 1.2 Goalie Stats
- Source URL:
  - `/Players/Statistics/LeadingGoaliesSVS/{season_group_id}`
- BigQuery table: `raw_sports.swehockey_goalie_stats`
- Main fields:
  - `goalie_name`, `team_code`
  - `games_played`, `shots_against`, `saves`, `goals_against`, `save_pct`, `gaa`
  - `season_group_id`, `team_id`, `scraped_at`, `source`

### 1.3 Standings
- Source URL:
  - `/ScheduleAndResults/Standings/{season_group_id}`
- BigQuery table: `raw_sports.swehockey_standings`
- Main fields:
  - `team_name`, `rank`, `games_played`
  - `wins`, `ot_wins`, `ot_losses`, `losses`, `goal_diff`, `points`
  - `season_group_id`, `scraped_at`, `source`

### 1.4 Schedule and Results
- Source URLs:
  - `/Teams/Info/Schedule/{team_id}`
  - fallback: `/ScheduleAndResults/Schedule/{season_group_id}`
- BigQuery table: `raw_sports.swehockey_schedule`
- Main fields:
  - `match_date`, `home_team`, `away_team`, `result`, `status`
  - `team_id`, `season_group_id`, `scraped_at`, `source`
- Extended fields (available in warehouse in current architecture):
  - `game_id`, `period_results`, `venue`, `spectators`, `match_time`

### 1.5 Game Events
- Ingested in existing event pipeline
- BigQuery table: `raw_sports.swehockey_game_events`
- Used by analytics for:
  - timeline, form, splits, h2h
  - special teams
  - player impact and goalie radar

### 1.6 Season Config
- BigQuery table: `raw_sports.swehockey_seasons`
- Main fields:
  - `season_key`, `regular_season_id`, `playoff_id`, `is_active`

## 2) API Coverage Today

| Endpoint | Reads from | Main output |
|---|---|---|
| `/api/v1/statistics` | player_stats, goalie_stats, standings, schedule, seasons | top scorers, top goalies, team record, team games, Bjorloven skaters/goalies |
| `/api/v1/analytics` | statistics sources + game_events | timeline, splits, periods, h2h, form, streaks, player impact, goalie radar, predictions, SHL transition |

## 3) Candidate Data to Add Next

| Candidate | Value | Effort | Priority | Notes |
|---|---|---|---|---|
| Team special teams table (PP/PK) | High | Low/Med | P1 | More robust than deriving everything from events |
| Extended goalie fields (SO, W/L, win%) | High | Low | P1 | Some fields already exist, standardize ingest |
| Full match metadata (`venue`, `spectators`, `period_results`, `match_time`) | Med/High | Low | P1 | Improves attendance and match-quality views |
| More penalty/discipline event classes | Medium | Medium | P2 | Better impact/risk modeling |
| More seasons (HA + SHL history) | High | Medium | P1 | Needed for stable predictions |
| Player profile fields (age, hand, height, weight) | Medium | Medium | P2 | If available in Swehockey pages |

## 4) Data Quality Guardrails

| Check | Threshold | Action |
|---|---|---|
| Team games empty | `team_games == 0` | Alert and block stale-empty caching |
| Analytics timeline empty | `len(timeline) == 0` with `status=ok` | Alert and force refetch/fallback |
| Standing missing | `team_standing is null` | Rebuild record from schedule and set data-quality flag |
| Team-name mojibake | normalization hit | Use `team_id` as primary key |

## 5) Architecture Rules (must keep)

1. Use stable keys first (`team_id`, `game_id`).
2. Use name/token matching only as fallback.
3. Never cache "ok but empty" analytics payloads in client.
4. Run production smoke tests after deploy:
   - `/api/v1/statistics`
   - `/api/v1/analytics`
   - `/api/silly-season`
