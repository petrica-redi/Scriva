#!/usr/bin/env python3
"""Update Notion task database — MindCare AI DEMO-focused roadmap.
Clears existing tasks and replaces with demo-oriented tasks based on:
- Market Research V2 (competitor gaps, clinician interviews)
- Key Features & Implementation roadmap
- Demo-first approach: mock data, UI flows, showcaseable features
"""
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
        data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)

def notion_patch(endpoint, body):
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{endpoint}",
        data=json.dumps(body).encode(), headers=HEADERS, method="PATCH")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"ERROR {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)

# 1. Find existing database
print("Finding existing task database...")
results = notion_post("search", {
    "query": "MindCare AI",
    "filter": {"value": "database", "property": "object"}
})

db_id = None
for r in results.get("results", []):
    if r["object"] == "database":
        title = "".join(t.get("plain_text", "") for t in r.get("title", []))
        if "Task" in title or "Roadmap" in title:
            db_id = r["id"]
            print(f"Found database: {db_id} — {title}")
            break

if not db_id:
    print("ERROR: Database not found! Run the original script first to create it.")
    sys.exit(1)

# 2. Archive all existing tasks
print("Archiving existing tasks...")
has_more = True
start_cursor = None
archived = 0
while has_more:
    query_body = {"page_size": 100}
    if start_cursor:
        query_body["start_cursor"] = start_cursor
    resp = notion_post(f"databases/{db_id}/query", query_body)
    for page in resp.get("results", []):
        notion_patch(f"pages/{page['id']}", {"archived": True})
        archived += 1
    has_more = resp.get("has_more", False)
    start_cursor = resp.get("next_cursor")
print(f"Archived {archived} existing tasks.")

# 3. Update database properties for demo focus
print("Updating database properties...")
try:
    notion_patch(f"databases/{db_id}", {
        "title": [{"type": "text", "text": {"content": "MindCare AI — Demo Task List"}}],
        "properties": {
            "Phase": {
                "select": {
                    "options": [
                        {"name": "🎯 Demo Core", "color": "red"},
                        {"name": "🧠 AI Features Demo", "color": "purple"},
                        {"name": "👤 Patient Portal Demo", "color": "blue"},
                        {"name": "🎨 UI/UX Polish", "color": "green"},
                        {"name": "🔒 Compliance Demo", "color": "gray"},
                        {"name": "📊 Analytics Demo", "color": "yellow"},
                        {"name": "🚀 Post-Demo MVP", "color": "default"},
                    ]
                }
            },
        }
    })
    print("Database updated.")
except Exception as ex:
    print(f"Could not update properties: {ex}")

# 4. New DEMO-focused tasks
tasks = [
    # ============================================================
    # 🎯 DEMO CORE — Platforma trebuie să funcționeze end-to-end
    # ============================================================
    ("Generare date demo psihiatrie: 3 clinicieni, 15 pacienți cu diagnostice mentale, transcrieri, risk flags",
     "🔴 P0 — Critic", "Backend", "🎯 Demo Core", "🟡 Mediu (2-8h)", "Technical Debt",
     "Pacienți cu: depresie, anxietate, bipolar, PTSD, BPD, schizofrenie, ADHD, anorexie, dependență alcool, OCD, panică. Fiecare cu istoric de consultații și transcrieri realiste în română."),

    ("Test flow complet: înregistrare audio → transcriere → generare notă clinică",
     "🔴 P0 — Critic", "Testing", "🎯 Demo Core", "🟡 Mediu (2-8h)", "Technical Debt",
     "Deepgram transcription + AI note generation. Verifică că totul merge end-to-end cu date reale."),

    ("Verificare language switcher RO/EN funcțional pe toate paginile",
     "🔴 P0 — Critic", "Frontend", "🎯 Demo Core", "🟢 Mic (< 2h)", "User Request",
     "Interfața trebuie să fie complet bilingvă: română și engleză. Toate label-urile, butoanele, meniurile."),

    ("Interfață bilingvă completă (RO + EN) — toate paginile, meniurile, butoanele",
     "🔴 P0 — Critic", "Frontend", "🎯 Demo Core", "🔴 Mare (1-2 săpt)", "User Request",
     "Diana a cerut explicit: platforma trebuie să aibă două interfețe — română și engleză. Traducere completă UI."),

    ("Fix navigare: Dashboard, Patients, Consultations, Calendar, Analytics, Templates, Settings",
     "🔴 P0 — Critic", "Testing", "🎯 Demo Core", "🟡 Mediu (2-8h)", "Technical Debt",
     "Testare pagină cu pagină, fix bug-uri găsite. Inclusiv /templates/new/edit 404 și settings overwrite bug."),

    ("Regenerare chei API (Deepgram + Anthropic) — cele curente sunt expuse",
     "🔴 P0 — Critic", "Securitate", "🎯 Demo Core", "🟢 Mic (< 2h)", "Technical Debt",
     "Cheile actuale au fost comise în repo. Trebuie regenerate și stocate safe în .env.local."),

    ("Fix .gitignore — .env.local nu trebuie să ajungă în repo",
     "🔴 P0 — Critic", "Securitate", "🎯 Demo Core", "🟢 Mic (< 2h)", "Technical Debt",
     "Previne expunerea viitoare a credențialelor."),

    # ============================================================
    # 🧠 AI FEATURES DEMO — Core AI diferențiatori
    # ============================================================
    ("🧠 Risk Flags Engine — detectare automată: risc suicidar, self-harm, non-complianță, deteriorare",
     "🔴 P0 — Critic", "AI/ML", "🧠 AI Features Demo", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "Din transcriere sau date pacient, AI identifică red flags: ideație suicidară, auto-vătămare, abuz substanțe, simptome psihotice, non-complianță la medicație, interacțiuni medicamentoase. Afișare cu severity: low/medium/high/critical. Bazat pe interviuri clinicieni — 3/4 au cerut asta."),

    ("Dashboard Risk Flags — vizualizare consolidată a tuturor alertelor active pe pacienți",
     "🔴 P0 — Critic", "Frontend", "🧠 AI Features Demo", "🟡 Mediu (2-8h)", "Clinician Interviews",
     "Panou vizual cu toți pacienții care au alerte active, sortați pe severity. Click pe pacient → detalii."),

    ("Detecție simptome psihiatrice în timp real — AI ascultă și sugerează simptome + ICD-10",
     "🟡 P1 — Important", "AI/ML", "🧠 AI Features Demo", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "Side panel în timpul consultației: simptome detectate, cod ICD-10 sugerat, 'ask next' suggestions. Psihiatrul din interviu #2 a cerut explicit asta — economisește 15-17 min/consultație. NICIUN competitor nu are asta."),

    ("Side panel simptome — clinicianul confirmă cu un click, se populează examenul structurat",
     "🟡 P1 — Important", "Frontend", "🧠 AI Features Demo", "🟡 Mediu (2-8h)", "Clinician Interviews",
     "UI: chips/tags cu simptome detectate. Click = confirmed. Se populează automat în Mental Status Exam."),

    ("AI Clinical Consultant — 'Second Opinion' pentru cazuri complexe",
     "🟡 P1 — Important", "AI/ML", "🧠 AI Features Demo", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "Clinicianul descrie un caz → AI sugerează: diagnostice diferențiale, abordări terapeutice, literatură relevantă. 3/4 clinicieni au cerut asta, Mentalyc nu are."),

    ("Analiză longitudinală — 'Pe baza ultimelor 6 luni de sesiuni, pattern-ul sugerează...'",
     "🟢 P2 — Îmbunătățire", "AI/ML", "🧠 AI Features Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Demo cu date mock: arată evoluția pacientului pe mai multe consultații. Vizualizare trends."),

    ("Generare note clinice psihiatrice — template-uri: Evaluare Psihiatrică, Notă Psihoterapie, SOAP, Fișă Consultații RO",
     "🟡 P1 — Important", "AI/ML", "🧠 AI Features Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Note specifice sănătății mintale, nu generic medical. Include MSE, plan terapeutic, medicație."),

    ("Mental Status Exam auto-fill din transcript",
     "🟡 P1 — Important", "AI/ML", "🧠 AI Features Demo", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "Câmpuri: Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content, Perception, Cognition, Insight, Judgment. Psihiatrul intervievat și-a construit propriul tool basic pentru asta — validare puternică."),

    ("Generare automată scrisori referral GP/psihiatru/specialist",
     "🟡 P1 — Important", "AI/ML", "🧠 AI Features Demo", "🟡 Mediu (2-8h)", "Competitor Gap",
     "Heidi are deja. Template-uri per țară: UK NHS, RO CNAS. Generat din note + istoric pacient."),

    # ============================================================
    # 👤 PATIENT PORTAL DEMO — Diferențiator major
    # ============================================================
    ("👤 Patient Portal — login separat, dashboard pacient",
     "🟡 P1 — Important", "Patient Portal", "👤 Patient Portal Demo", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "NICIUN competitor nu are asta. 3/4 clinicieni au cerut. Portal separat unde pacientul interacționează între sesiuni."),

    ("Journaling cu guided prompts (între sesiuni)",
     "🟡 P1 — Important", "Patient Portal", "👤 Patient Portal Demo", "🟡 Mediu (2-8h)", "Clinician Interviews",
     "'Cum te-ai simțit azi?', 'Ce ai observat la gândurile tale?', 'Descrie un moment pozitiv'. Prompturi configurabile per terapeut."),

    ("Mood tracking zilnic (scor + notițe)",
     "🟡 P1 — Important", "Patient Portal", "👤 Patient Portal Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Slider 1-10, emoji, notă opțională. Vizualizare trend pe grafic. Date demo pre-populate pentru prezentare."),

    ("Vizualizare rezumate sesiuni + action points (partajate de clinician)",
     "🟡 P1 — Important", "Patient Portal", "👤 Patient Portal Demo", "🟡 Mediu (2-8h)", "Clinician Interviews",
     "Clinicianul aprobă ce vede pacientul. Rezumat simplificat, fără terminologie clinică."),

    ("Clinician acknowledge cu emoji/reaction — 'feeling seen'",
     "🟢 P2 — Îmbunătățire", "Patient Portal", "👤 Patient Portal Demo", "🟢 Mic (< 2h)", "Clinician Interviews",
     "'Feeling seen — even minimally — can be deeply supportive for depression' — din interviuri."),

    # ============================================================
    # 🎨 UI/UX POLISH — Arată bine la demo
    # ============================================================
    ("Responsive design — verificare și fix pe mobil/tabletă",
     "🟡 P1 — Important", "Frontend", "🎨 UI/UX Polish", "🟡 Mediu (2-8h)", "Technical Debt",
     "Demo poate fi pe tablet la prezentări. Trebuie să arate decent."),

    ("Dashboard principal — date reale (nu placeholder) cu pacienți psihiatrici",
     "🟡 P1 — Important", "Frontend", "🎨 UI/UX Polish", "🟡 Mediu (2-8h)", "Technical Debt",
     "Dashboard să arate: consultații de azi, risk flags active, next appointments, recent notes."),

    ("Calendar funcțional cu consultații demo pre-populate",
     "🟡 P1 — Important", "Frontend", "🎨 UI/UX Polish", "🟡 Mediu (2-8h)", "Technical Debt",
     "Calendar cu ședințe planificate, culori per tip (psihiatrie, psihoterapie, evaluare)."),

    ("Pagina Settings — fix overwrite bug + UI curat",
     "🟢 P2 — Îmbunătățire", "Frontend", "🎨 UI/UX Polish", "🟢 Mic (< 2h)", "Technical Debt",
     "Settings se suprascriu la save. Bug cunoscut."),

    # ============================================================
    # 📊 ANALYTICS DEMO — Vizualizări impresionante
    # ============================================================
    ("📊 Analytics Dashboard — statistici clinician cu date demo",
     "🟡 P1 — Important", "Frontend", "📊 Analytics Demo", "🟡 Mediu (2-8h)", "Competitor Gap",
     "Nr. consultații/săptămână, distribuție diagnostice, risk flags trends, outcomes per pacient. Grafice cu date mock."),

    ("Patient Progress Charts — evoluție mood, simptome pe timp",
     "🟡 P1 — Important", "Frontend", "📊 Analytics Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Grafic linie: mood score pe 3 luni. Bar chart: frecvența simptomelor. Radar: domains of functioning."),

    ("Risk Overview Panel — câți pacienți per nivel de risc",
     "🔴 P0 — Critic", "Frontend", "📊 Analytics Demo", "🟡 Mediu (2-8h)", "Clinician Interviews",
     "Vizual tip semafor: 🔴 Critical (2), 🟠 High (3), 🟡 Medium (5), 🟢 Low (5). Click pe categorie → lista pacienți."),

    # ============================================================
    # 🔒 COMPLIANCE DEMO — Arată că suntem serioși
    # ============================================================
    ("GDPR consent flow pentru procesare AI — demo functional",
     "🟡 P1 — Important", "Securitate", "🔒 Compliance Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Pacientul dă consimțământ explicit pentru: înregistrare, transcriere, procesare AI. Stocat cu timestamp."),

    ("Audit log funcțional — cine a făcut ce și când",
     "🟡 P1 — Important", "Backend", "🔒 Compliance Demo", "🟡 Mediu (2-8h)", "Market Research",
     "Tabel audit_log deja există. Trebuie populat la fiecare acțiune. Demo cu date mock."),

    ("Autentificare demo — login simplu cu email/parolă (3 conturi clinician pre-create)",
     "🟡 P1 — Important", "Backend", "🔒 Compliance Demo", "🟡 Mediu (2-8h)", "Technical Debt",
     "Dr. Ana Petrescu (psihiatru), Dr. Radu Marinescu (psiholog), Dr. Irina Vlad (psihoterapeut). Fiecare vede doar pacienții lor."),

    # ============================================================
    # 🚀 POST-DEMO MVP — După ce demo-ul e gata
    # ============================================================
    ("Deploy pe cloud (Hetzner EU) + domeniu propriu + HTTPS",
     "🟢 P2 — Îmbunătățire", "DevOps", "🚀 Post-Demo MVP", "🟡 Mediu (2-8h)", "Technical Debt",
     "Hetzner €5/lună, server EU pentru GDPR. Let's Encrypt HTTPS."),

    ("Between-Session Messaging securizat (înlocuiește WhatsApp)",
     "🟢 P2 — Îmbunătățire", "Feature", "🚀 Post-Demo MVP", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "Toate clinicienii folosesc WhatsApp — nu e GDPR compliant. Messaging E2E encrypted cu ore configurabile."),

    ("Automated scheduling + reminders + no-show prevention",
     "🟢 P2 — Îmbunătățire", "Feature", "🚀 Post-Demo MVP", "🔴 Mare (1-2 săpt)", "Clinician Interviews",
     "SMS/email reminders, smart rescheduling, waitlist management."),

    ("Living Patient Dossier — timeline view cronologic",
     "🟢 P2 — Îmbunătățire", "Feature", "🚀 Post-Demo MVP", "⚫ XL (3+ săpt)", "Clinician Interviews",
     "Tot într-un loc: sesiuni, note, transcrieri, mood data, journaling. AI insights pe longitudinal."),

    ("Therapeutic Alliance Tracking — analiză conversație",
     "🔵 P3 — Viitor", "AI/ML", "🚀 Post-Demo MVP", "🔴 Mare (1-2 săpt)", "Competitor Gap",
     "Mentalyc are, noi trebuie. Insight din tonul conversației, engagement pacient."),

    ("Treatment Plan Generation cu SMART goals",
     "🟢 P2 — Îmbunătățire", "AI/ML", "🚀 Post-Demo MVP", "🟡 Mediu (2-8h)", "Competitor Gap",
     "AI sugerează plan de tratament structurat: obiective SMART, intervenții, timeline."),

    ("Mobile App (iOS + Android) — React Native",
     "🔵 P3 — Viitor", "Feature", "🚀 Post-Demo MVP", "⚫ XL (3+ săpt)", "Market Research",
     "Clinician: view notes, respond messages. Patient: journaling, mood tracking."),

    ("EHR Integration (FHIR/HL7) — Hipocrate, InfoWorld",
     "🔵 P3 — Viitor", "Backend", "🚀 Post-Demo MVP", "⚫ XL (3+ săpt)", "Market Research",
     "Integrare cu sistemele spitalicești din România."),

    ("Multi-Language AI — FR, DE, ES",
     "🔵 P3 — Viitor", "AI/ML", "🚀 Post-Demo MVP", "🔴 Mare (1-2 săpt)", "Market Research",
     "Full support per limbă: transcriere + generare note + UI."),

    ("Billing & CNAS Integration",
     "🔵 P3 — Viitor", "Feature", "🚀 Post-Demo MVP", "⚫ XL (3+ săpt)", "Market Research",
     "Facturare, raportare asigurări, CNAS România."),

    ("Telehealth Integration — video + record + transcribe",
     "🔵 P3 — Viitor", "Feature", "🚀 Post-Demo MVP", "⚫ XL (3+ săpt)", "Market Research",
     "Built-in video calling sau integrare Zoom/Teams."),

    ("Pricing tiers: Free (10 notes) / Starter €20 / Pro €40 / Clinic €30/clinician",
     "🟢 P2 — Îmbunătățire", "Feature", "🚀 Post-Demo MVP", "🔴 Mare (1-2 săpt)", "Market Research",
     "Bazat pe competitor analysis: sub Heidi (free+pro), peste Mentalyc ($20-120)."),
]

print(f"\nAdding {len(tasks)} demo-focused tasks...")
for i, (name, priority, category, phase, effort, source, description) in enumerate(tasks):
    props = {
        "Task": {"title": [{"text": {"content": name}}]},
        "Priority": {"select": {"name": priority}},
        "Status": {"select": {"name": "To Do"}},
        "Effort": {"select": {"name": effort}},
    }
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

    # Add description as page content
    children = []
    if description:
        children.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": description}}]
            }
        })

    body = {
        "parent": {"database_id": db_id},
        "properties": props,
    }
    if children:
        body["children"] = children

    notion_post("pages", body)
    print(f"  [{i+1}/{len(tasks)}] {name[:70]}...")

print(f"\n✅ DONE! Replaced with {len(tasks)} demo-focused tasks.")
print("""
Tasks organized by phase:
  🎯 Demo Core (7) — Funcționare end-to-end
  🧠 AI Features Demo (9) — Risk Flags, Symptom Detection, Clinical Consultant
  👤 Patient Portal Demo (5) — Portal pacient (diferențiator unic)
  🎨 UI/UX Polish (4) — Arată bine la prezentare
  📊 Analytics Demo (3) — Vizualizări date
  🔒 Compliance Demo (3) — GDPR, Audit, Auth
  🚀 Post-Demo MVP (11) — Pentru după demo

Each task has:
  - Priority, Category, Phase, Effort, Value Source
  - Description with context from Market Research + Clinician Interviews
""")
