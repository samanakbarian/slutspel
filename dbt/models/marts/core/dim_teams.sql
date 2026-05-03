-- dim_teams.sql
-- Team dimension: one row per unique team, derived from match data.

WITH all_teams AS (
    -- Home teams
    SELECT DISTINCT
        home_team_id    AS team_id,
        home_team_name  AS team_name,
        home_team_abbr  AS team_abbr
    FROM {{ ref('stg_sr_matches') }}

    UNION DISTINCT

    -- Away teams
    SELECT DISTINCT
        away_team_id    AS team_id,
        away_team_name  AS team_name,
        away_team_abbr  AS team_abbr
    FROM {{ ref('stg_sr_matches') }}
)

SELECT
    team_id,
    team_name,
    team_abbr AS abbreviation,
    -- Add league context (will be enriched with EP data later)
    CASE
        WHEN team_id = 'sr:competitor:3747' THEN 'IF Björklöven'
        ELSE team_name
    END AS display_name,
    -- Placeholder colors (can be enriched later)
    CASE team_id
        WHEN 'sr:competitor:3747' THEN '#16a34a'  -- Björklöven green
        ELSE NULL
    END AS primary_color

FROM all_teams
