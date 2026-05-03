-- dim_matches.sql
-- Match dimension: one row per match with clean columns.

SELECT
    match_id,
    season_id,
    season_name,
    match_date,
    match_timestamp,
    home_team_id,
    home_team_name,
    away_team_id,
    away_team_name,
    home_score,
    away_score,
    winner_id,
    match_status,
    stage,
    round_number,
    -- Derived: result type
    CASE
        WHEN home_score = away_score THEN 'DRAW'  -- shouldn't happen in hockey but safety
        ELSE 'DECIDED'
    END AS result_category,
    -- Derived: league from competition name
    CASE
        WHEN competition_name LIKE '%Allsvenskan%' THEN 'HA'
        WHEN competition_name LIKE '%SHL%' THEN 'SHL'
        ELSE competition_name
    END AS league,
    period_scores

FROM {{ ref('stg_sr_matches') }}
WHERE match_status = 'closed'
