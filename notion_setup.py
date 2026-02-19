#!/usr/bin/env python3
"""Create MindCare AI audit report and task database in Notion."""
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

def text_block(content):
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": [{"type": "text", "text": {"content": content}}]
        }
    }

def heading2(content):
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": content}}]
        }
    }

def heading3(content):
    return {
        "object": "block",
        "type": "heading_3",
        "heading_3": {
            "rich_text": [{"type": "text", "text": {"content": content}}]
        }
    }

def bullet(content, bold_prefix=None):
    rt = []
    if bold_prefix:
        rt.append({"type": "text", "text": {"content": bold_prefix}, "annotations": {"bold": True}})
        rt.append({"type": "text", "text": {"content": content}})
    else:
        rt.append({"type": "text", "text": {"content": content}})
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {"rich_text": rt}
    }

def divider():
    return {"object": "block", "type": "divider", "divider": {}}

def callout(content, emoji="⚠️"):
    return {
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [{"type": "text", "text": {"content": content}}],
            "icon": {"type": "emoji", "emoji": emoji}
        }
    }

# Step 1: Check page access
print("Checking page access...")
page = notion_get(f"pages/{PAGE_ID}")
print(f"Page found: {page['object']} {page['id']}")

# Step 2: Create Audit Report as sub-page
print("\nCreating Audit Report page...")
report_page = notion_post("pages", {
    "parent": {"page_id": PAGE_ID},
    "icon": {"type": "emoji", "emoji": "🔍"},
    "properties": {
        "title": {"title": [{"text": {"content": "MindCare AI v1 — Audit Report"}}]}
    },
    "children": [
        callout("Audit realizat pe 17 Feb 2026 • Scor General: 7/10 — MVP solid, cu lacune importante", "📊"),
        divider(),
        heading2("✅ Ce e făcut bine"),
        heading3("Arhitectură & Structură (9/10)"),
        bullet("Separare clară: frontend (Next.js 15) + API routes + serviciu Python FastAPI"),
        bullet("Tipuri TypeScript complete și bine definite"),
        bullet("Validare input cu Zod pe toate endpoint-urile critice"),
        bullet("Organizare logică: hooks, stores, services, lib"),
        heading3("Baza de Date (9/10)"),
        bullet("Schema PostgreSQL completă cu 7+ tabele + relații corecte"),
        bullet("Row Level Security (RLS) pe TOATE tabelele"),
        bullet("Indexes pe coloanele frecvent interogate"),
        bullet("Full-text search pe transcrieri"),
        bullet("Trigger updated_at + auto-creare profil la signup"),
        bullet("Audit log table (structura există)"),
        heading3("Securitate (7/10)"),
        bullet("CSP, HSTS, X-Frame-Options, Referrer-Policy — toate configurate"),
        bullet("RLS — protecție excelentă la nivel de DB"),
        bullet("Auth check pe fiecare API route"),
        bullet("Ownership verification pe consultații"),
        bullet("HIPAA session timeout (15 min)"),
        bullet("Cleanup audio pe unmount (HIPAA compliance)"),
        heading3("Transcriere Audio (8/10)"),
        bullet("Dual mode: In-Person (mono + diarization) și Remote (stereo multichannel)"),
        bullet("Fallback inteligent: tab capture fail → single-mic diarization"),
        bullet("Fallback model: nova-3-medical → nova-2"),
        bullet("Suport multilingv (EN, RO, DE, FR, ES + altele)"),
        heading3("Generare Note AI (8/10)"),
        bullet("6 template-uri: SOAP, Referral, Discharge, Progress, Patient Handout, Specialist"),
        bullet("Prompt engineering solid cu instrucțiuni clare"),
        bullet("Suport multilingv complet (titluri + conținut traduse)"),
        bullet("Billing codes (ICD-10 + CPT) cu confidence scoring"),
        bullet("Regenerare per secțiune sau notă completă"),
        heading3("AI Assistant (7/10)"),
        bullet("Analiză consultație live: diagnostice, follow-up questions, red flags"),
        bullet("Detectare interacțiuni medicamentoase"),
        bullet("Chat general cu context medical"),
        divider(),
        heading2("⚠️ Probleme găsite"),
        heading3("🔴 Critice"),
        bullet(" WebSocket Auth lipsă — audio.py: oricine poate conecta la WebSocket", "1."),
        bullet(" Chei API expuse — .env.local cu chei reale în ZIP-ul partajat", "2."),
        bullet(" Audit log nu e populat — tabela există dar nimeni nu scrie în ea", "3."),
        bullet(" Python service nu pornește automat — transcriere live nu merge fără el", "4."),
        heading3("🟡 Medii"),
        bullet(" EHR Integration — toate endpoint-urile returnează 'coming in Phase 4'", "5."),
        bullet(" Export PDF — menționat în UI dar neimplementat", "6."),
        bullet(" Teste zero — setup Vitest+Playwright există, dar fără teste scrise", "7."),
        bullet(" Consent recording — nu salvează timestamp-ul corect", "8."),
        bullet(" Patient-Consultation link slab — se bazează pe text liber, nu FK", "9."),
        bullet(" Duplicare generare note — implementată ȘI în Next.js ȘI în Python", "10."),
        heading3("🟢 Mici"),
        bullet("No error boundary global React"),
        bullet("No loading states consistente"),
        bullet("No rate limiting pe API routes"),
        bullet("No pagination UI (API-ul suportă dar frontend-ul nu)"),
        bullet("No dark mode, no email notifications, no data export"),
        bullet("Docker compose incomplet"),
        divider(),
        heading2("🔐 Note Securitate"),
        callout("URGENT: Rotește TOATE cheile API (Anthropic, Deepgram, Supabase) — sunt expuse în ZIP-ul partajat!", "🚨"),
        bullet("unsafe-eval + unsafe-inline în CSP — ok pentru dev, de strâns pentru producție"),
        bullet("RLS pe Supabase — bine implementat"),
        bullet("Headers de securitate — bine configurate"),
        divider(),
        heading2("💰 Tech Stack & Costuri Estimate"),
        bullet("Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query"),
        bullet("Backend: Supabase (PostgreSQL + Auth + RLS), Python FastAPI"),
        bullet("AI: Anthropic Claude (note generation), Deepgram Nova 3 Medical (transcriere)"),
        bullet("Costuri lunare estimate: $345-845 (Deepgram $200-500, Claude $100-300, Supabase $25, Vercel $20)"),
    ]
})
report_id = report_page["id"]
print(f"Report created: {report_id}")

# Step 3: Create Task Database
print("\nCreating Task Database...")
db = notion_post("databases", {
    "parent": {"page_id": PAGE_ID},
    "icon": {"type": "emoji", "emoji": "📋"},
    "title": [{"type": "text", "text": {"content": "MindCare AI — Task List"}}],
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
                ]
            }
        },
        "Effort": {
            "select": {
                "options": [
                    {"name": "🟢 Mic (< 2h)", "color": "green"},
                    {"name": "🟡 Mediu (2-8h)", "color": "yellow"},
                    {"name": "🔴 Mare (> 8h)", "color": "red"},
                ]
            }
        },
    }
})
db_id = db["id"]
print(f"Database created: {db_id}")

# Step 4: Add tasks
tasks = [
    # P0
    ("Rotește TOATE cheile API (Anthropic, Deepgram, Supabase)", "🔴 P0 — Critic", "Securitate", "🟢 Mic (< 2h)"),
    ("Implementează autentificare WebSocket pe Python service", "🔴 P0 — Critic", "Securitate", "🟡 Mediu (2-8h)"),
    ("Implementează audit logging pe acțiuni critice", "🔴 P0 — Critic", "Securitate", "🟡 Mediu (2-8h)"),
    ("Rezolvă duplicarea generare note (Next.js API vs Python)", "🔴 P0 — Critic", "Backend", "🟡 Mediu (2-8h)"),
    ("Implementează login/signup funcțional (fix auth flow)", "🔴 P0 — Critic", "Backend", "🟡 Mediu (2-8h)"),
    # P1
    ("Setup & documentare Python AI service complet", "🟡 P1 — Important", "DevOps", "🟡 Mediu (2-8h)"),
    ("Implementează export PDF note clinice", "🟡 P1 — Important", "Feature", "🟡 Mediu (2-8h)"),
    ("Implementează delete consultation în UI", "🟡 P1 — Important", "Frontend", "🟢 Mic (< 2h)"),
    ("Fix patient-consultation linking (FK din DB, nu text liber)", "🟡 P1 — Important", "Backend", "🟡 Mediu (2-8h)"),
    ("Implementează consent timestamp saving corect", "🟡 P1 — Important", "Backend", "🟢 Mic (< 2h)"),
    ("Adaugă error boundary global React", "🟡 P1 — Important", "Frontend", "🟢 Mic (< 2h)"),
    ("Adaugă rate limiting pe API routes", "🟡 P1 — Important", "Securitate", "🟡 Mediu (2-8h)"),
    # P2
    ("Scrie teste unitare (API routes, validators, hooks)", "🟢 P2 — Îmbunătățire", "Testing", "🔴 Mare (> 8h)"),
    ("Scrie teste E2E (login → record → generate note)", "🟢 P2 — Îmbunătățire", "Testing", "🔴 Mare (> 8h)"),
    ("Implementează pagination UI pe liste", "🟢 P2 — Îmbunătățire", "Frontend", "🟡 Mediu (2-8h)"),
    ("Adaugă dark mode", "🟢 P2 — Îmbunătățire", "Frontend", "🟡 Mediu (2-8h)"),
    ("Implementează notificări email", "🟢 P2 — Îmbunătățire", "Feature", "🟡 Mediu (2-8h)"),
    ("Adaugă data export (CSV/JSON)", "🟢 P2 — Îmbunătățire", "Feature", "🟡 Mediu (2-8h)"),
    ("Mobile optimization complet", "🟢 P2 — Îmbunătățire", "Frontend", "🟡 Mediu (2-8h)"),
    ("Docker compose complet (frontend + Python + Supabase)", "🟢 P2 — Îmbunătățire", "DevOps", "🟡 Mediu (2-8h)"),
    # P3
    ("EHR Integration (FHIR R4)", "🔵 P3 — Viitor", "Feature", "🔴 Mare (> 8h)"),
    ("Real-time collaboration pe note", "🔵 P3 — Viitor", "Feature", "🔴 Mare (> 8h)"),
    ("Multi-tenancy / organizații", "🔵 P3 — Viitor", "Backend", "🔴 Mare (> 8h)"),
    ("Analytics avansate cu grafice", "🔵 P3 — Viitor", "Feature", "🟡 Mediu (2-8h)"),
    ("Calendar integration (Google/Outlook)", "🔵 P3 — Viitor", "Feature", "🔴 Mare (> 8h)"),
]

print(f"\nAdding {len(tasks)} tasks...")
for i, (name, priority, category, effort) in enumerate(tasks):
    notion_post("pages", {
        "parent": {"database_id": db_id},
        "properties": {
            "Task": {"title": [{"text": {"content": name}}]},
            "Priority": {"select": {"name": priority}},
            "Status": {"select": {"name": "To Do"}},
            "Category": {"select": {"name": category}},
            "Effort": {"select": {"name": effort}},
        }
    })
    print(f"  [{i+1}/{len(tasks)}] {name[:50]}...")

print(f"\n✅ DONE! Created:")
print(f"   - Audit Report page")
print(f"   - Task Database with {len(tasks)} tasks")
print(f"   - All under StartUP page")
