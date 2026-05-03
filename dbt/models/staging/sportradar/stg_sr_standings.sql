-- stg_sr_standings.sql
-- Flatten Sportradar standings into one row per team.

WITH raw AS (
    SELECT *
    FROM {{ source('sportradar', 'standings') }}
),

flattened AS (
    SELECT
        team_standing.competitor.id                 AS team_id,
        team_standing.competitor.name               AS team_name,
        team_standing.competitor.abbreviation       AS team_abbr,
        team_standing.rank                          AS table_rank,
        team_standing.played                        AS games_played,
        team_standing.win                           AS wins,
        team_standing.loss                          AS losses,
        team_standing.draw                          AS draws,
        team_standing.win_normaltime                AS wins_reg,
        team_standing.loss_normaltime               AS losses_reg,
        team_standing.win_overtime                  AS wins_ot,
        team_standing.loss_overtime                 AS losses_ot,
        team_standing.win_shootout                  AS wins_so,
        team_standing.loss_shootout                 AS losses_so,
        team_standing.goals_for                     AS goals_for,
        team_standing.goals_against                 AS goals_against,
        team_standing.goals_diff                    AS goal_difference,
        team_standing.points                        AS points,
        team_standing.ppg                           AS points_per_game,
        team_standing.current_outcome               AS current_outcome

    FROM raw,
    UNNEST(standings) AS standing,
    UNNEST(standing.groups) AS grp,
    UNNEST(grp.standings) AS team_standing
)

SELECT * FROM flattened
