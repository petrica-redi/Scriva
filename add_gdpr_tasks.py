#!/usr/bin/env python3
"""Add GDPR compliance tasks to Notion."""
import json, urllib.request, sys

TOKEN = "ntn_b1252725706I7fzoZlFoOjlDFPMPAbwPTpbpilnT6X42t5"
PAGE_ID = "30a04aab13ca80dba64ff51cbb2f9ae1"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

def notion_post(endpoint, body):
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{endpoint}",
        data=json.dumps(body).encode(),
        headers=HEADERS,
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)

# Find existing database
print("Looking for existing task database...")
results = notion_post("search", {"query": "Task", "filter": {"property": "object", "value": "database"}})
db_id = None
for r in results.get("results", []):
    if r["object"] == "database":
        title_parts = r.get("title", [])
        title = "".join(t.get("plain_text", "") for t in title_parts)
        if "Task" in title or "Roadmap" in title:
            db_id = r["id"]
            print(f"Found database: {db_id} — {title}")
            break

if not db_id:
    print("No task database found, creating one...")
    db = notion_post("databases", {
        "parent": {"page_id": PAGE_ID},
        "icon": {"type": "emoji", "emoji": "📋"},
        "title": [{"type": "text", "text": {"content": "MedScribe AI — Tasks"}}],
        "properties": {
            "Task": {"title": {}},
            "Priority": {
                "select": {
                    "options": [
                        {"name": "🔴 P0 — Critic", "color": "red"},
                        {"name": "🟡 P1 — Important", "color": "yellow"},
                        {"name": "🟢 P2 — Îmbunătățire", "color": "green"},
                        {"name": "🔵 P3 — Viitor", "color": "blue"},
                    ]
                }
            },
            "Status": {
                "select": {
                    "options": [
                        {"name": "📝 To Do", "color": "default"},
                        {"name": "🔄 In Progress", "color": "blue"},
                        {"name": "✅ Done", "color": "green"},
                    ]
                }
            },
            "Category": {
                "select": {
                    "options": [
                        {"name": "GDPR", "color": "red"},
                        {"name": "Feature", "color": "blue"},
                        {"name": "UI/UX", "color": "green"},
                        {"name": "Backend", "color": "yellow"},
                    ]
                }
            },
        }
    })
    db_id = db["id"]
    print(f"Created database: {db_id}")

# GDPR tasks
tasks = [
    # Priority 1: Privacy Policy & Terms
    {
        "name": "Privacy Policy page — explain what data we collect, why, how long we keep it, who we share with (Deepgram, Anthropic, Supabase)",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Terms of Service page",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    # Priority 2: Delete My Data
    {
        "name": "\"Delete My Data\" button — complete deletion of patient data (transcripts, notes, recordings, consultations)",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Data deletion API endpoint — cascade delete across all tables for a patient",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    # Priority 3: Export data
    {
        "name": "Export patient data as PDF (clinical notes, transcripts, consultations)",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    {
        "name": "Export patient data as JSON (machine-readable, GDPR portability)",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    # Priority 4: Audit log
    {
        "name": "Enhanced audit log — track every data access, modification, deletion with user ID and timestamp",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    {
        "name": "Audit log viewer in Settings page for doctors",
        "priority": "🟢 P2 — Îmbunătățire",
        "category": "GDPR",
    },
    # Priority 5: Granular consent
    {
        "name": "Granular consent — separate checkboxes for: audio recording, AI transcription, AI clinical analysis",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Store consent records in database with timestamps (who consented, to what, when)",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Consent withdrawal mechanism — patient can revoke consent, triggers data handling review",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    # DPA & Third-party
    {
        "name": "Data Processing Agreements (DPA) — Deepgram, Anthropic, Supabase",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Document all third-party data flows in Privacy Policy (what data goes where)",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    # Data retention
    {
        "name": "Data retention policy — define how long data is kept, auto-delete after expiry",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    {
        "name": "Data retention settings in admin panel (configurable per practice)",
        "priority": "🟢 P2 — Îmbunătățire",
        "category": "GDPR",
    },
    # AI Act
    {
        "name": "AI transparency notice — inform patients that AI is used for transcription and clinical analysis",
        "priority": "🔴 P0 — Critic",
        "category": "GDPR",
    },
    {
        "name": "Human oversight: doctor must review and approve all AI-generated notes before finalizing",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    # Encryption & security
    {
        "name": "Verify data encryption at rest (Supabase) and in transit (HTTPS/TLS)",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
    {
        "name": "DPIA (Data Protection Impact Assessment) document for the AI processing pipeline",
        "priority": "🟡 P1 — Important",
        "category": "GDPR",
    },
]

print(f"\nAdding {len(tasks)} GDPR tasks...")
for i, task in enumerate(tasks):
    props = {
        "Task": {"title": [{"text": {"content": task["name"]}}]},
        "Priority": {"select": {"name": task["priority"]}},
        "Status": {"select": {"name": "📝 To Do"}},
        "Category": {"select": {"name": task["category"]}},
    }
    try:
        notion_post("pages", {
            "parent": {"database_id": db_id},
            "properties": props
        })
        print(f"  [{i+1}/{len(tasks)}] ✅ {task['name'][:70]}...")
    except:
        # Try without Category if property doesn't exist
        del props["Category"]
        notion_post("pages", {
            "parent": {"database_id": db_id},
            "properties": props
        })
        print(f"  [{i+1}/{len(tasks)}] ✅ (no category) {task['name'][:70]}...")

print(f"\n✅ Done! Added {len(tasks)} GDPR compliance tasks to Notion.")
