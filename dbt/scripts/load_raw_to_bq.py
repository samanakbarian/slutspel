"""
Load raw Sportradar JSON from GCS into BigQuery tables.
Handles the nested JSON structure by flattening arrays into rows.
"""
import json
import sys
from google.cloud import storage, bigquery

PROJECT_ID = "granskaren-d51a1"
BUCKET_NAME = "loven-stats-raw-data-prod"
LOCATION = "europe-west1"

bq_client = bigquery.Client(project=PROJECT_ID)
gcs_client = storage.Client(project=PROJECT_ID)

def load_gcs_json(blob_path):
    """Load a JSON file from GCS and return as dict."""
    bucket = gcs_client.bucket(BUCKET_NAME)
    blob = bucket.blob(blob_path)
    return json.loads(blob.download_as_text())

def load_summaries():
    """Load summaries: flatten the array so each match is one row."""
    print("Loading summaries...")
    data = load_gcs_json("raw/sportradar/sr:season:131137_summaries.json")
    
    # Each summary becomes a row with the full nested structure
    rows = data.get("summaries", [])
    print(f"  Found {len(rows)} matches")
    
    table_id = f"{PROJECT_ID}.raw_sportradar.summaries"
    
    # Delete existing table and recreate
    bq_client.delete_table(table_id, not_found_ok=True)
    
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        autodetect=True,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )
    
    # Convert rows to NDJSON
    ndjson = "\n".join(json.dumps(row, ensure_ascii=False) for row in rows)
    
    job = bq_client.load_table_from_json(
        rows, table_id, job_config=job_config
    )
    job.result()
    
    table = bq_client.get_table(table_id)
    print(f"  ✅ Loaded {table.num_rows} rows into {table_id}")

def load_standings():
    """Load standings as a single row (one snapshot)."""
    print("Loading standings...")
    data = load_gcs_json("raw/sportradar/sr:season:131137_standings.json")
    
    rows = [data]  # Single row with full nested structure
    table_id = f"{PROJECT_ID}.raw_sportradar.standings"
    
    bq_client.delete_table(table_id, not_found_ok=True)
    
    job_config = bigquery.LoadJobConfig(
        autodetect=True,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )
    
    job = bq_client.load_table_from_json(
        rows, table_id, job_config=job_config
    )
    job.result()
    
    table = bq_client.get_table(table_id)
    print(f"  ✅ Loaded {table.num_rows} rows into {table_id}")

def load_timelines():
    """Load all timeline files: each file becomes one row."""
    print("Loading timelines...")
    bucket = gcs_client.bucket(BUCKET_NAME)
    blobs = list(bucket.list_blobs(prefix="raw/sportradar/sr:sport_event:"))
    
    if not blobs:
        print("  ⚠️ No timeline files found")
        return
    
    rows = []
    for blob in blobs:
        if "_timeline.json" in blob.name:
            data = json.loads(blob.download_as_text())
            rows.append(data)
            print(f"  Found: {blob.name}")
    
    if not rows:
        print("  ⚠️ No timeline rows to load")
        return
    
    table_id = f"{PROJECT_ID}.raw_sportradar.timelines"
    
    bq_client.delete_table(table_id, not_found_ok=True)
    
    job_config = bigquery.LoadJobConfig(
        autodetect=True,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )
    
    job = bq_client.load_table_from_json(
        rows, table_id, job_config=job_config
    )
    job.result()
    
    table = bq_client.get_table(table_id)
    print(f"  ✅ Loaded {table.num_rows} rows into {table_id}")

if __name__ == "__main__":
    load_summaries()
    load_standings()
    load_timelines()
    print("\n🎉 All raw data loaded into BigQuery!")
