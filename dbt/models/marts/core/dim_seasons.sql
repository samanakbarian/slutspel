-- dim_seasons.sql
-- Season dimension: one row per season.

SELECT DISTINCT
    season_id,
    season_name,
    CASE
        WHEN competition_name LIKE '%Allsvenskan%' THEN 'HA'
        WHEN competition_name LIKE '%SHL%' THEN 'SHL'
        ELSE competition_name
    END AS league,
    MIN(match_date) AS start_date,
    MAX(match_date) AS end_date

FROM {{ ref('stg_sr_matches') }}
GROUP BY 1, 2, 3
