-- stg_sr_matches.sql
-- Flatten Sportradar season summaries into one row per match.
-- The load script already flattened the "summaries" array, so each row IS a match.

WITH raw AS (
    SELECT *
    FROM {{ source('sportradar', 'summaries') }}
)

SELECT
    -- Match identifiers
    sport_event.id                                          AS match_id,
    sport_event.sport_event_context.season.id               AS season_id,
    sport_event.sport_event_context.season.name             AS season_name,
    sport_event.sport_event_context.competition.id          AS competition_id,
    sport_event.sport_event_context.competition.name        AS competition_name,

    -- Timing
    CAST(sport_event.start_time AS TIMESTAMP)               AS match_timestamp,
    DATE(CAST(sport_event.start_time AS TIMESTAMP))         AS match_date,

    -- Stage / Round
    sport_event.sport_event_context.stage.phase             AS stage,
    sport_event.sport_event_context.round.number            AS round_number,

    -- Home team (qualifier = 'home' is always first in Sportradar)
    sport_event.competitors[SAFE_OFFSET(0)].id              AS home_team_id,
    sport_event.competitors[SAFE_OFFSET(0)].name            AS home_team_name,
    sport_event.competitors[SAFE_OFFSET(0)].abbreviation    AS home_team_abbr,

    -- Away team
    sport_event.competitors[SAFE_OFFSET(1)].id              AS away_team_id,
    sport_event.competitors[SAFE_OFFSET(1)].name            AS away_team_name,
    sport_event.competitors[SAFE_OFFSET(1)].abbreviation    AS away_team_abbr,

    -- Scores
    sport_event_status.home_score                           AS home_score,
    sport_event_status.away_score                           AS away_score,
    sport_event_status.winner_id                            AS winner_id,
    sport_event_status.status                               AS match_status,

    -- Period scores (as nested struct array)
    sport_event_status.period_scores                        AS period_scores

FROM raw
