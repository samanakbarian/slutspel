-- stg_sr_events.sql
-- Flatten Sportradar timeline events into one row per play-by-play event.
-- Source: GCS raw JSON loaded into raw_sportradar.timelines

WITH raw AS (
    SELECT *
    FROM {{ source('sportradar', 'timelines') }}
),

flattened AS (
    SELECT
        -- Event identifiers
        CAST(event.id AS STRING)                            AS event_id,
        raw.sport_event.id                                  AS match_id,

        -- Event details
        event.type                                          AS event_type,
        CAST(event.time AS TIMESTAMP)                       AS event_timestamp,
        event.period_name                                   AS period_name,
        event.period                                        AS period_number,
        event.match_time                                    AS match_minute,
        event.match_clock                                   AS match_clock,

        -- Scores at time of event
        event.home_score                                    AS home_score,
        event.away_score                                    AS away_score,

        -- Team context
        event.competitor                                    AS team_qualifier,

        -- Players (for goals: scorer + assists)
        event.players                                       AS players,

        -- Penalty info
        event.break_name                                    AS break_name

    FROM raw,
    UNNEST(timeline) AS event
)

SELECT * FROM flattened
