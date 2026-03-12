# Audit platformă IT — MedScribe AI

**Data:** Martie 2026  
**Perspectivă:** Audit „ca artist” — ce nu funcționează, ce e fragil, ce lipsește.

---

## 1. Ce funcționează (build & rutare)

- **Build Next.js:** Compilare reușită, fără erori TypeScript.
- **Auth:** Session Supabase (middleware + layout), redirect corect neautentificat → signin, autentificat pe /auth → dashboard.
- **Rute:** Toate paginile principale există (dashboard, consultation/new, record, note, prescription, patients, analytics, calendar, templates, portal, follow-ups, ai-assistant, settings). Linkurile din sidebar și din aplicație duc la rute existente.
- **Flux consultație:** new → record → note / prescription; restul app-ului linkează în general la `/consultation/[id]/note`.

---

## 2. Ce nu funcționează sau e rupt

### 2.1 API lipsă: `GET /api/templates/[id]`

- **Unde:** `src/services/api.ts` — `templatesApi.get(id)` face `fetch(\`/api/templates/${id}\`)`.
- **Problema:** Nu există `src/app/api/templates/[id]/route.ts`. Doar `api/templates/route.ts` (GET listă + POST create). Apelul la `templates.get(id)` dă **404**.
- **Impact actual:** Pagina de editare template (`/templates/[id]/edit`) **nu** folosește API-ul; citește direct din Supabase (`note_templates`). Deci editarea merge, dar **contractul API e rupt**: orice cod care va apela `api.templates.get(id)` va eșua.
- **Recomandare:** Fie implementezi `api/templates/[id]/route.ts` (GET, eventual PATCH/DELETE), fie elimini `templatesApi.get()` din `api.ts` ca să nu existe API „fantomă”.

---

## 3. Ce e fragil / risc

### 3.1 Sentry fără auth token

- La build apar avertismente: *No auth token provided. Will not create release / upload source maps.*
- **Impact:** Fără token, Sentry nu încarcă source maps; erorile din producție sunt mai greu de citit.
- **Recomandare:** Setează `SENTRY_AUTH_TOKEN` (sau dezactivează telemetria/release-urile) ca să nu polueze logurile și ca producția să fie clară.

### 3.2 Variabile de mediu

- **Critice:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auth, audit, referral, clinics).
- **Pe funcționalități:** DEEPGRAM, ANTHROPIC, OLLAMA, RESEND, REFERRAL_FROM_EMAIL, FHIR_SERVER_URL etc. Lipsa lor dezactivează feature-uri (AI, transcriere, email, FHIR) fără neapărat un mesaj clar pentru utilizator.
- **Recomandare:** O pagină „Status servicii” în Settings (AI, transcriere, email) care arată ce e configurat și ce nu, reduce confuzia „de ce nu merge X?”.

### 3.3 Sign out fără feedback la eșec

- **Unde:** `app-shell.tsx` — `handleSignOut` face POST la `/api/auth/signout`. La `response.ok` redirect la signin; la eșec doar `console.error`.
- **Impact:** Dacă sign out eșuează (rețea, server), utilizatorul rămâne pe pagină fără mesaj.
- **Recomandare:** Toast sau mesaj „Nu s-a putut deconecta. Încearcă din nou.” când `!response.ok`.

### 3.4 Tratare erori în API-uri

- Multe componente fac `fetch` și au `.catch()` sau verifică `response.ok`, dar mesajele către utilizator sunt inegale (toast vs alert vs nimic). Unele API-uri returnează JSON cu `error`, altele nu.
- **Recomandare:** Un pattern comun: la orice `fetch` pentru acțiuni user (save, delete, send), la 4xx/5xx afișezi un mesaj clar (toast) și eventual reîncărci datele sau revii la listă.

---

## 4. Ce lipsește din punct de vedere UX / flux

### 4.1 Fără pagină „hub” consultație

- Există `/consultation/[id]/record`, `/consultation/[id]/note`, `/consultation/[id]/prescription`, dar **nu** există `/consultation/[id]` (o pagină index pentru o consultație).
- **Impact:** Dacă cineva ajunge cu un link la `/consultation/123` (fără /record, /note, /prescription), primește 404.
- **Recomandare:** Fie redirect de la `/consultation/[id]` către `/consultation/[id]/note` (sau record dacă e în desfășurare), fie o pagină mică cu 3 butoane: Record / Note / Prescription.

### 4.2 Navigare după „New consultation”

- După crearea unei consultații noi, user-ul e dus la `/consultation/[id]/record` — e clar. Dar din record trece în note; din note nu e evident cum revii la record (doar prin URL sau back). Tabs sau breadcrumb (Record | Note | Prescription) ar face fluxul mai clar.

### 4.3 Template edit: două surse de adevăr

- Lista de template-uri vine din API (`/api/templates`), dar **editarea** se face direct pe Supabase (`note_templates`). Dacă mai târziu pui RLS sau proxy prin API, trebuie aliniat: fie totul prin API (inclusiv GET by id), fie totul direct Supabase cu documentare clară.

---

## 5. Inconsistențe / „arte” neunite

### 5.1 Mesaje către utilizator

- Unele pagini: toast (sistemul de toast din design).
- Altele: `alert()` (ex. în note page — „Link copied to clipboard”).
- **Recomandare:** Un singur canal pentru feedback (toast) peste tot, inclusiv pentru „copied to clipboard”.

### 5.2 Sidebar: „System health” mereu „Operational”

- Blocul „Session readiness” / „System health” afișează mereu „Operational” (text static).
- **Impact:** Dacă nu reflectă starea reală (ex. AI down, Deepgram down), utilizatorul înțelege greșit că totul e ok.
- **Recomandare:** Fie îl faci dinamic (un mic API/status care verifică AI, transcriere), fie îl renunți sau pui „Info” neutru, nu „Operational”.

### 5.3 Limba / i18n

- Există `useTranslation`, `I18nProvider`, `LanguageSwitcher` — dar nu e clar dacă toate stringurile sunt în fișierele de traducere sau dacă rămân stringuri hardcodate în componente. O verificare: căutare după stringuri în română/engleză care nu sunt prin `t()`.

---

## 6. Rezumat priorități

| Prioritate | Element | Acțiune |
|------------|---------|--------|
| **Înaltă** | API `GET /api/templates/[id]` lipsă | Implementează ruta sau șterge `templatesApi.get()` |
| **Medie** | Sign out la eșec | Toast + eventual retry |
| **Medie** | `/consultation/[id]` 404 | Redirect sau pagină hub |
| **Medie** | Sentry auth token | Setează sau dezactivează avertismentele |
| **Scăzută** | Feedback uniform (toast vs alert) | Înlocuiește `alert` cu toast |
| **Scăzută** | System health dinamic | Fie real, fie neutru |
| **Scăzută** | Status servicii în Settings | Pagină care arată ce e configurat (AI, Deepgram, etc.) |

---

## 7. Concluzie

Platforma este **coerentă** din punct de vedere al structurii (Next 15, Supabase, rute, auth) și **compilează**. „Ce nu funcționează” în sens strict este în principal: **un endpoint API declarat în client dar inexistent** (`templates/[id]`). Restul sunt **fragilități** (Sentry, env, sign out) și **lipsuri de rafinament UX** (hub consultație, mesaje uniforme, system health). Remedieri punctuale pe cele de mai sus duc la o experiență mai previzibilă și mai ușor de depanat în producție.
