# Integrare pe baza transcriptului Traian (5 martie 2026)

Documentul sintetizează ce trebuie integrat în MedScribe pe baza feedback-ului din discuția cu un medic specialist (psihiatrie), cu separare clară între **elemente globale** și **elemente specifice pieței din România**.

---

## 1. Elemente GLOBALE (de integrat în produsul pentru toate piețele)

### 1.1 Copilot / Diagnostic

- **Criterii de clasificare, nu protocoale terapeutice**  
  Diagnosticul trebuie bazat pe **ICD-10** (și, unde e relevant, **DSM**) și pe **criteriile** de acolo, nu pe protocoale terapeutice.
- **Criterii de timp**  
  Respectarea strictă a criteriilor de **durată** (ex.: GAD = cel puțin 6 luni; depresie majoră = cel puțin 2 săptămâni; prim episod psihotic acut vs. schizofrenie în funcție de durata simptomelor).
- **Criterii de severitate**  
  Ex.: pentru GAD – numărul de manifestări fizice și psihice cerute (ex. min. 3+3), tensiune musculară, iritabilitate, neliniște.
- **Raționament explicit**  
  În reasoning pentru fiecare diagnostic diferențial: care criterii par îndeplinite și care **nu** (ex. „criteriul de 6 luni nu este documentat în transcript”).
- **Întrebări suplimentare**  
  Sugestii de întrebări pentru clarificarea **duratei**, **severității** și a **somatizațiilor** (dureri, parestezii, alte simptome fizice) pentru a putea aplica corect criteriile.

### 1.2 Recomandări medicale / Ghiduri

- **Ghiduri structurate, bazate pe evidență**  
  Referințe la surse de tip NICE, Maudsley Prescribing Guide, CANMAT etc. (nivel de evidență, nu „protocoale” folosite ca sursă pentru diagnostic).
- **Tratament vs. diagnostic**  
  Ghidurile de tratament (linii de tratament, ordine) sunt pentru **recomandări terapeutice**; diagnosticul rămâne pe criterii ICD/DSM.

### 1.3 Interacțiuni medicamentoase

- Păstrare și consolidare a funcționalității existente (considerată foarte utilă în transcript).
- Opțional viitor: sugestii de **echivalență de doză** la schimbarea medicamentului (utile pentru medici tineri).

### 1.4 Billing / Coduri

- **Coduri de billing** ajustabile de către medic și exportabile pentru sisteme externe (genericity, fără logică specifică unei țări).

### 1.5 UX / Calitate transcriere

- **Microfon**  
  Documentare sau hint: pentru vorbire rapidă (anxietate, manie), microfoane externe (ex. environmental/USB) pot îmbunătăți transcrierea; lag-ul la vorbire foarte rapidă este cunoscut.

### 1.6 Analitică / Dashboard

- **Risc / Need attention**  
  Definit pe specialitate (ex.: risc suicid, efecte adverse, evoluție nefavorabilă în psihiatrie; risc infarct în cardio etc.). Poate rămâne configurabil/în fază ulterioară la nivel global.

---

## 2. Elemente pentru PIAȚA DIN ROMÂNIA (nu implementate în această fază)

- **Norme COCA** și contract cu Casa de Asigurări: raportare, validare, perioade.
- **Bilete de trimitere, Anexa 13**, scrisori medicale (ex. Anexa 400), formulări conforme contractului cu casa.
- **Rețete**: validare conform protocolului cu casa, listă A/B, compensat vs. rețetă simplă, avertizare când nu e conform.
- **Concedii medicale**: reguli și sancțiuni (ex. amenzi) – informație pentru fluxuri viitoare.
- **SIUI** și alte platforme naționale: integrare cu sistemul național.
- **Certificat handicap**: valabilitate, alerte când expiră.
- **Second opinion**: legea relevantă și fluxuri de programare/trimiteri.
- **Legea 95** (alegerea profesionistului de către pacient) – impact pe booking și trimiteri.
- **Template-uri și formulare** specifice România (bilete, scrisori, raportare casă).
- **Discuții cu Mășteanu** / experți pentru managementul clinic în România.

---

## 3. Pași pentru elementele GLOBALE (implementare)

| Pas | Descriere | Status |
|-----|-----------|--------|
| 1 | **Diagnostic**: Actualizare prompt-uri (analyze-consultation + clinical-decision-support) pentru a cere explicit folosirea **criteriilor ICD-10/DSM** (timp, severitate) și reasoning care să indice criterii îndeplinite/neîndeplinite. | ✅ Implementat |
| 2 | **Întrebări de follow-up**: În prompt-ul de analiză, include sugestii explicite de întrebări pentru **durată**, **severitate** și **somatizări** (dureri, parestezii, alte simptome fizice). | ✅ Implementat |
| 3 | **CDS (differentials)**: Aliniere prompt CDS la aceleași reguli: differentials cu reasoning bazat pe criterii și pe eventuale „gaps” (ex. criteriu de timp nespecificat). | ✅ Implementat |
| 4 | **Ghiduri**: În CDS, guideline_nudges să citeze surse de tip NICE / Maudsley / CANMAT (evidence-based), fără a folosi protocoale terapeutice ca sursă pentru diagnostic. | ✅ Implementat |
| 5 | (Opțional) **Dose equivalence**: Sugestii de echivalență de doză la schimbare medicament – poate fi adăugat într-o fază ulterioară. | Backlog |
| 6 | (Opțional) **Hint microfon**: Text în UI sau în documentație despre microfoane externe pentru vorbire rapidă. | Backlog |

---

## 4. Copilot – Îmbunătățiri diagnostic și recomandări

- **Diagnostic**:  
  - Criterii ICD-10 (și DSM unde e cazul): timp, severitate, număr de simptome.  
  - În răspuns: „Criteriul de X luni nu este documentat” / „Este nevoie de clarificare pentru Y”.  
  - Diferențial clar: de ce un diagnostic e mai puțin probabil (ex. lipsă criteriu de timp).
- **Recomandări**:  
  - Ghiduri evidence-based (NICE, Maudsley, CANMAT etc.) pentru **tratament**; diagnosticul rămâne pe criterii.  
  - Interacțiuni medicamentoase păstrate și evidențiate.
- **România**:  
  - Toate punctele din secțiunea 2 (COCA, casă, rețete, SIUI, formulare etc.) vor fi luate în considerare într-o fază dedicată pieței din România, fără a fi incluse în implementarea globală curentă.

---

## 5. Verificare

După ce verifici acest document și listele de mai sus:

- **Implementare curentă**: doar **elementele globale** din secțiunile 1 și 3 (pașii 1–4).
- **Elementele pentru România** rămân documentate aici și vor fi implementate într-o fază ulterioară, specifică pieței.

Dacă vrei modificări la clasificare (global vs. România) sau la pași, spune ce să ajustăm înainte de a finaliza implementarea tehnică.

---

## 6. Prescripție Inteligentă (integrat)

Implementare făcută:

- **Baza de date**: tabele `medications`, `medication_protocols`, `dose_equivalences` (migrare `20260306100000_smart_prescription.sql`).
- **Medicamente**: listă cu listă A/B/C, compensat, sursă (cnas, maudsley, canmat, internal). Seed cu medicamente psihiatrice comune.
- **Protocoale**: ce se prescrie pe ce diagnostic (ICD-10), pe ce linie (1 = primul tratament, 2 = dacă nu merge etc.), listă, compensat. Sursă: Maudsley / CANMAT-style.
- **Echivalență de doză**: când medicul schimbă de pe un medicament pe altul, aplicația calculează doza echivalentă (API + UI).
- **Arbore decizional**: tratament recomandat după diagnostic (First-line, Second-line) în UI pe pagina de rețetă.
- **API**: `GET /api/smart-prescription/medications`, `GET /api/smart-prescription/dose-equivalence`, `GET /api/smart-prescription/treatment-pathway`.
- **UI**: panoul „Prescripție Inteligentă” pe pagina de rețetă (sugestii după diagnostic, căutare medicamente, calculator echivalență doză).

Efort rămas (conform cerințelor):

- **Licențiere/acces**: Maudsley Prescribing Guidelines, CANMAT – conținutul complet trebuie licențiat și integrat în `medication_protocols` / ghiduri.
- **Baza de medicamente din România**: lista CNAS – încărcare în `medications` cu `source=cnas`, `region=RO`, listă A/B/C și compensat conforme cu CNAS.
- **Validare**: un farmacolog sau psihiatru să valideze regulile (protocoale și echivalențe de doză).
