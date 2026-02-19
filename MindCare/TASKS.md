# MindCare AI — Task-uri prioritizate

## 🔴 P0 — URGENT (Demo funcțional)
1. **Testare pagină cu pagină** — Dashboard, Patients, Consultations, Calendar, Analytics, Templates, Settings
2. **Test înregistrare audio + transcriere** (Deepgram) — flow complet live
3. **Test generare notă clinică cu AI** (Claude/Anthropic) — verificare output
4. **Fix bug-uri găsite la testare** — repar pe loc ce nu merge
5. **Regenerare chei API** — Deepgram + Anthropic (cele curente sunt expuse în cod)
6. **Fix .gitignore** — .env.local nu trebuie să ajungă în repo

## 🟠 P1 — MVP pentru medici (1-2 săptămâni)
1. **Autentificare reală** — login cu email/parolă (înlocuire demo auth)
2. **Deploy pe cloud** — VPS (Hetzner/DigitalOcean ~€5/lună) + domeniu propriu
3. **Certificat HTTPS real** — Let's Encrypt (nu self-signed)
4. **Responsive design** — verificare și fix pe mobil/tabletă
5. **Onboarding medic nou** — flux simplu de înregistrare
6. **Backup automat** baza de date PostgreSQL
7. **Analytics funcționale** — cu date reale, nu doar demo
8. **Billing API + Services** — implementare completă
9. **Audit logging** — cine a făcut ce și când
10. **Full-text search** — căutare în pacienți/consultații
11. **Fix /templates/new/edit 404**
12. **Fix settings overwrite bug**

## 🟡 P2 — Nice to have
1. **Multi-medic** — mai mulți doctori pe aceeași instanță
2. **Export PDF** notă clinică
3. **Integrare calendar extern** (Google Calendar etc.)
4. **Notificări** — reminder consultații
5. **Update Notion** — sincronizare task board
