#!/usr/bin/env python3
"""Update Notion task database with full MindCare roadmap tasks."""
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

def notion_get(endpoint):
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{endpoint}",
        headers=HEADERS,
    )
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)

def notion_patch(endpoint, body):
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{endpoint}",
        data=json.dumps(body).encode(),
        headers=HEADERS,
        method="PATCH"
    )
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)

# First, find the existing database
print("Finding existing task database...")
results = notion_post("search", {
    "query": "MindCare AI — Task List",
    "filter": {"value": "database", "property": "object"}
})

db_id = None
for r in results.get("results", []):
    if r["object"] == "database":
        title_parts = r.get("title", [])
        title = "".join(t.get("plain_text", "") for t in title_parts)
        if "Task" in title:
            db_id = r["id"]
            print(f"Found database: {db_id} — {title}")
            break

if not db_id:
    print("Database not found! Creating new one...")
    db = notion_post("databases", {
        "parent": {"page_id": PAGE_ID},
        "icon": {"type": "emoji", "emoji": "📋"},
        "title": [{"type": "text", "text": {"content": "MindCare AI — Full Roadmap Tasks"}}],
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
                        {"name": "To Do", "color": "default"},
                        {"name": "In Progress", "color": "yellow"},
                        {"name": "Done", "color": "green"},
                        {"name": "Blocked", "color": "red"},
                    ]
                }
            },
            "Category": {
                "select": {
                    "options": [
                        {"name": "Securitate", "color": "red"},
                        {"name": "Backend", "color": "purple"},
                        {"name": "Frontend", "color": "blue"},
                        {"name": "Testing", "color": "orange"},
                        {"name": "DevOps", "color": "gray"},
                        {"name": "Feature", "color": "green"},
                        {"name": "AI/ML", "color": "pink"},
                        {"name": "Patient Portal", "color": "brown"},
                        {"name": "Market Research", "color": "default"},
                    ]
                }
            },
            "Phase": {
                "select": {
                    "options": [
                        {"name": "Phase 1 — Demo Polish", "color": "red"},
                        {"name": "Phase 2 — MVP Differentiators", "color": "yellow"},
                        {"name": "Phase 3 — Growth Features", "color": "green"},
                        {"name": "Phase 4 — Scale", "color": "blue"},
                    ]
                }
            },
            "Effort": {
                "select": {
                    "options": [
                        {"name": "🟢 Mic (< 2h)", "color": "green"},
                        {"name": "🟡 Mediu (2-8h)", "color": "yellow"},
                        {"name": "🔴 Mare (1-2 săpt)", "color": "red"},
                        {"name": "⚫ XL (3+ săpt)", "color": "default"},
                    ]
                }
            },
            "Value Source": {
                "select": {
                    "options": [
                        {"name": "Clinician Interviews", "color": "purple"},
                        {"name": "Market Research", "color": "blue"},
                        {"name": "Competitor Gap", "color": "orange"},
                        {"name": "Technical Debt", "color": "red"},
                        {"name": "User Request", "color": "green"},
                    ]
                }
            },
        }
    })
    db_id = db["id"]
    print(f"Created database: {db_id}")

# Update existing database to add new properties
print("Updating database properties...")
try:
    notion_patch(f"databases/{db_id}", {
        "properties": {
            "Phase": {
                "select": {
                    "options": [
                        {"name": "Phase 1 — Demo Polish", "color": "red"},
                        {"name": "Phase 2 — MVP Differentiators", "color": "yellow"},
                        {"name": "Phase 3 — Growth Features", "color": "green"},
                        {"name": "Phase 4 — Scale", "color": "blue"},
                    ]
                }
            },
            "Value Source": {
                "select": {
                    "options": [
                        {"name": "Clinician Interviews", "color": "purple"},
                        {"name": "Market Research", "color": "blue"},
                        {"name": "Competitor Gap", "color": "orange"},
                        {"name": "Technical Debt", "color": "red"},
                        {"name": "User Request", "color": "green"},
                    ]
                }
            },
        }
    })
    print("Database properties updated.")
except:
    print("Could not update properties, continuing...")

# Now add the new roadmap tasks
tasks = [
    # ============ PHASE 1 — Demo Polish (This Week) ============
    ("Test full flow: record → transcribe → generate note", "🔴 P0 — Critic", "Testing", "Phase 1 — Demo Polish", "🟡 Mediu (2-8h)", "Technical Debt"),
    ("Fix bugs found during testing", "🔴 P0 — Critic", "Backend", "Phase 1 — Demo Polish", "🟡 Mediu (2-8h)", "Technical Debt"),
    ("Verify language switcher (EN/RO) works", "🔴 P0 — Critic", "Testing", "Phase 1 — Demo Polish", "🟢 Mic (< 2h)", "Technical Debt"),
    ("Deploy on cloud (VPS + domain)", "🟡 P1 — Important", "DevOps", "Phase 1 — Demo Polish", "🟡 Mediu (2-8h)", "Technical Debt"),
    ("Let's Encrypt HTTPS certificate", "🟡 P1 — Important", "DevOps", "Phase 1 — Demo Polish", "🟢 Mic (< 2h)", "Technical Debt"),

    # ============ PHASE 2 — MVP Differentiators (Weeks 2-4) ============
    # Feature 1: Real-Time Psychiatric Symptom Detection (from interviews + competitor gap)
    ("🧠 Psychiatric Symptom Detection — AI ascultă consultația și identifică simptome în timp real", "🔴 P0 — Critic", "AI/ML", "Phase 2 — MVP Differentiators", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Mapare automată simptome → coduri ICD-10", "🔴 P0 — Critic", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Competitor Gap"),
    ("Side panel: simptome detectate + sugestii 'ask next'", "🔴 P0 — Critic", "Frontend", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),
    ("Clinician confirmă cu un click → auto-populează examenul structurat", "🔴 P0 — Critic", "Frontend", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),

    # Feature 2: Smart Clinical Note Generation (refinement)
    ("Refinare generare note clinice — template-uri SOAP, Psychiatric Eval, Psychotherapy Progress, Fișă Consultații (RO)", "🟡 P1 — Important", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("Suport complet RO + EN pentru output note", "🟡 P1 — Important", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),

    # Feature 3: Patient Portal (from interviews — NO competitor has this)
    ("👤 Patient Portal — login separat de clinician", "🔴 P0 — Critic", "Patient Portal", "Phase 2 — MVP Differentiators", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Journaling cu guided prompts", "🟡 P1 — Important", "Patient Portal", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),
    ("Mood tracking (scor zilnic + notițe)", "🟡 P1 — Important", "Patient Portal", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("Vizualizare rezumate sesiuni + action points", "🟡 P1 — Important", "Patient Portal", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),
    ("Upload reflecții, voice notes", "🟢 P2 — Îmbunătățire", "Patient Portal", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("Clinician acknowledge cu emoji/reaction ('feeling seen')", "🟢 P2 — Îmbunătățire", "Patient Portal", "Phase 2 — MVP Differentiators", "🟢 Mic (< 2h)", "Clinician Interviews"),

    # Feature 4: AI Clinical Consultant (from interviews — Mentalyc doesn't have it)
    ("🤖 AI Clinical Consultant — descrie un caz complex, AI sugerează diagnostice diferențiale", "🔴 P0 — Critic", "AI/ML", "Phase 2 — MVP Differentiators", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Analiză longitudinală: 'Based on 6 months of sessions, the pattern suggests...'", "🟡 P1 — Important", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("Risk flags: risc suicidar, interacțiuni medicamentoase, deteriorare", "🔴 P0 — Critic", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),

    # Feature 5: GP/Referral Letter Generation (Heidi has it, clinicians need it)
    ("📄 Generare automată scrisori de referral către GP/psihiatri/specialiști", "🟡 P1 — Important", "AI/ML", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Competitor Gap"),
    ("Template-uri customizabile per țară (UK NHS, RO CNAS)", "🟡 P1 — Important", "Feature", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),

    # Feature 8: Mental Status Exam Auto-Population (psychiatrist validation)
    ("🧪 Mental Status Exam — auto-populare din transcript", "🟡 P1 — Important", "AI/ML", "Phase 2 — MVP Differentiators", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Câmpuri: Appearance, Behavior, Speech, Mood, Affect, Thought process/content, Perception, Cognition, Insight, Judgment", "🟡 P1 — Important", "Frontend", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Clinician Interviews"),

    # ============ PHASE 3 — Growth Features (Months 2-3) ============
    ("📅 Automated Scheduling + No-Show Prevention — reminders SMS/email/push", "🟡 P1 — Important", "Feature", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Smart rescheduling + waitlist management", "🟢 P2 — Îmbunătățire", "Feature", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Market Research"),
    
    ("💬 Secure Between-Session Messaging — înlocuiește WhatsApp", "🟡 P1 — Important", "Feature", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Clinician Interviews"),
    ("Boundary-respecting: ore configurabile, auto-replies, E2E encrypted", "🟡 P1 — Important", "Feature", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Market Research"),

    ("📊 Progress Tracking & Analytics — trends mood, symptom severity pe timp", "🟡 P1 — Important", "Feature", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Market Research"),
    ("Dashboard clinician: outcomes per pacient, frecvență sesiuni, risk overview", "🟡 P1 — Important", "Frontend", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Competitor Gap"),
    ("Rapoarte exportabile pentru asigurări/CNAS", "🟢 P2 — Îmbunătățire", "Feature", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Market Research"),

    ("📂 Living Patient Dossier — toate sesiunile, notele, datele într-un singur record", "🟡 P1 — Important", "Feature", "Phase 3 — Growth Features", "⚫ XL (3+ săpt)", "Clinician Interviews"),
    ("Timeline view: journey cronologic al pacientului", "🟡 P1 — Important", "Frontend", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Clinician Interviews"),
    ("AI insights: 'Since medication change on [date], sleep scores improved 40%'", "🟢 P2 — Îmbunătățire", "AI/ML", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Market Research"),

    # VALUE-ADD from Market Research
    ("🎯 Therapeutic Alliance Tracking — insight din analiza conversației (Mentalyc are, noi trebuie)", "🟡 P1 — Important", "AI/ML", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Competitor Gap"),
    ("Treatment Plan Generation cu SMART goals", "🟡 P1 — Important", "AI/ML", "Phase 3 — Growth Features", "🟡 Mediu (2-8h)", "Competitor Gap"),
    ("Multi-professional collaboration (psihiatru ↔ psihoterapeut ↔ GP)", "🟢 P2 — Îmbunătățire", "Feature", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Market Research"),

    # ============ PHASE 4 — Scale (Months 3-6) ============
    ("📱 Mobile App (iOS + Android) — React Native", "🔵 P3 — Viitor", "Feature", "Phase 4 — Scale", "⚫ XL (3+ săpt)", "Market Research"),
    ("🏥 EHR Integration (FHIR/HL7) — Hipocrate, InfoWorld", "🔵 P3 — Viitor", "Backend", "Phase 4 — Scale", "⚫ XL (3+ săpt)", "Market Research"),
    ("🌍 Multi-Language AI — FR, DE, ES full support", "🔵 P3 — Viitor", "AI/ML", "Phase 4 — Scale", "🔴 Mare (1-2 săpt)", "Market Research"),
    ("💳 Billing & CNAS Integration — facturare + raportare", "🔵 P3 — Viitor", "Feature", "Phase 4 — Scale", "⚫ XL (3+ săpt)", "Market Research"),
    ("📹 Telehealth Integration — video calling + record + transcribe", "🔵 P3 — Viitor", "Feature", "Phase 4 — Scale", "⚫ XL (3+ săpt)", "Market Research"),
    
    # GDPR & Compliance (from market research)
    ("🔒 GDPR Data Protection Impact Assessment (DPIA)", "🟡 P1 — Important", "Securitate", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("EU data hosting setup (Hetzner/OVH EU)", "🟡 P1 — Important", "DevOps", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),
    ("Patient consent flow for AI processing", "🟡 P1 — Important", "Feature", "Phase 2 — MVP Differentiators", "🟡 Mediu (2-8h)", "Market Research"),

    # Pricing tiers implementation
    ("💰 Implementare pricing tiers: Free (10 notes) / Starter €20 / Pro €40 / Clinic €30/clinician", "🟢 P2 — Îmbunătățire", "Feature", "Phase 3 — Growth Features", "🔴 Mare (1-2 săpt)", "Market Research"),
]

print(f"\nAdding {len(tasks)} roadmap tasks...")
for i, (name, priority, category, phase, effort, source) in enumerate(tasks):
    props = {
        "Task": {"title": [{"text": {"content": name}}]},
        "Priority": {"select": {"name": priority}},
        "Status": {"select": {"name": "To Do"}},
        "Effort": {"select": {"name": effort}},
    }
    # Try adding Phase and Value Source, but don't fail if properties don't exist
    try:
        props["Phase"] = {"select": {"name": phase}}
    except:
        pass
    try:
        props["Value Source"] = {"select": {"name": source}}
    except:
        pass
    try:
        props["Category"] = {"select": {"name": category}}
    except:
        pass

    notion_post("pages", {
        "parent": {"database_id": db_id},
        "properties": props
    })
    print(f"  [{i+1}/{len(tasks)}] {name[:60]}...")

print(f"\n✅ DONE! Added {len(tasks)} roadmap tasks to Notion.")
print("Tasks include:")
print("  - Phase 1: Demo Polish (5 tasks)")
print("  - Phase 2: MVP Differentiators (20+ tasks)")
print("  - Phase 3: Growth Features (15+ tasks)")  
print("  - Phase 4: Scale (5 tasks)")
print("  - GDPR & Compliance (3 tasks)")
print("  - Pricing implementation (1 task)")
print("\nValue sources tagged: Clinician Interviews, Market Research, Competitor Gap, Technical Debt")
