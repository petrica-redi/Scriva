# LLM-uri Specializate Medical — Cercetare MindCare

Data: 2026-02-24

---

## 🔒 Closed-Source (API)

| Model | Dezvoltator | Limbi | Specializare | Preț Input/Output per 1M tokeni | Acces |
|-------|------------|-------|-------------|-------------------------------|-------|
| **Med-PaLM 2** | Google | EN | Cel mai performant pe USMLE (86.5%), MedQA, PubMedQA | Nu e public (acces restricționat) | API restricționat |
| **GPT-4o** | OpenAI | EN + multilingv | Excelent pe MedQA (90%+), nu e fine-tuned dar performează top | $2.50 / $10 | API OpenAI |
| **GPT-4o mini** | OpenAI | EN + multilingv | Versiune ieftină, bun pentru triaj | $0.15 / $0.60 | API OpenAI |
| **Claude Sonnet 4** | Anthropic | EN, FR, DE, ES, RO + multilingv | Top pe raționament clinic, excelent pe română | $3 / $15 | API Anthropic |
| **Claude Opus 4** | Anthropic | EN, FR, DE, ES, RO + multilingv | Cel mai puternic raționament, overkill pentru real-time | $15 / $75 | API Anthropic |
| **Claude Haiku 3.5** | Anthropic | EN + multilingv | Rapid și ieftin, bun pentru triaj/screening | $0.80 / $4 | API Anthropic |
| **Gemini 2.5 Flash** | Google | EN + multilingv | Surprinzător de bun la medical, foarte ieftin | $0.15 / $0.60 | API Google |
| **Gemini 2.5 Pro** | Google | EN + multilingv | Performanță top, bun pe medical | $1.25 / $10 | API Google |
| **Mistral Large** | Mistral | EN, FR + multilingv | Decent pe medical, bun pe franceză | $2 / $6 | API Mistral |

---

## 🔓 Open-Source — Engleză

| Model | Bază | Parametri | Specializare | Benchmark | Preț |
|-------|------|-----------|-------------|-----------|------|
| **Med-Gemini** | Gemini | — | Diagnostic multimodal, imagistică + text | 91.1% MedQA | Gratuit (research) |
| **MedAlpaca** | LLaMA | 7B / 13B | Întrebări medicale, dialog | ~60% MedQA | Gratuit (self-hosted) |
| **PMC-LLaMA** | LLaMA | 7B / 13B | Antrenat pe 4.8M articole PubMed Central | Bun pe PubMedQA | Gratuit (self-hosted) |
| **BioMistral** | Mistral 7B | 7B | Antrenat pe PubMed, bun pe QA medical | ~65% MedQA | Gratuit (self-hosted) |
| **Clinical-Camel** | LLaMA-2 | 70B | Raționament clinic, note clinice | ~70% MedQA | Gratuit (self-hosted) |
| **Meditron** | LLaMA-2 | 7B / 70B | Antrenat pe PubMed + ghiduri clinice + MIMIC | 70%+ MedQA | Gratuit (self-hosted) |
| **OpenBioLLM** | LLaMA-3 | 8B / 70B | Cel mai performant open-source medical | 72.5% MedQA | Gratuit (self-hosted) |
| **BioGPT** | GPT-2 | 1.5B | Generare text biomedical, relații medicamente | PubMedQA top | Gratuit (self-hosted) |
| **GatorTron** | Megatron | 8.9B | Antrenat pe 90B cuvinte din EHR (note clinice) | NER, NLI clinic | Gratuit (self-hosted) |
| **Me LLaMA** | LLaMA | 13B / 70B | Antrenat pe 129B tokeni medicali + 214K instrucțiuni | Broad medical | Gratuit (self-hosted) |

**Cost self-hosting (estimare GPU cloud):**
- 7B model: ~$0.20-0.50/oră (1x A10G / T4)
- 13B model: ~$0.50-1.00/oră (1x A100 40GB)
- 70B model: ~$2-4/oră (2-4x A100 80GB)

---

## 🔓 Open-Source — Multilingv (inclusiv non-EN)

| Model | Limbi | Parametri | Specializare | Preț |
|-------|-------|-----------|-------------|------|
| **BioMistral-7B-DARE** | EN, FR, ES, DE, IT, PT, **RO**, NL, ZH | 7B | Cel mai multilingv medical; antrenat pe PubMed | Gratuit (self-hosted, ~$0.30/oră) |
| **Taiyi (太一)** | ZH + EN | 7B | Bilingv medical chineză-engleză | Gratuit |
| **HuatuoGPT** | ZH | 7B / 13B | ChatGPT medical pentru chineză | Gratuit |
| **DoctorGLM** | ZH | 6B | Bazat pe ChatGLM, conversații medicale chineze | Gratuit |
| **BenTsao (本草)** | ZH | 7B | LLaMA fine-tuned pe instrucțiuni medicale chineze | Gratuit |
| **Asclepius** | KO + EN | 7B / 13B | Fine-tuned pe note clinice sintetice | Gratuit |
| **ClinicalBERT** | EN | 110M | BERT fine-tuned pe MIMIC-III (note clinice) | Gratuit (rulează pe CPU) |
| **PubMedBERT** | EN | 110M | BERT antrenat de la zero pe PubMed | Gratuit (rulează pe CPU) |
| **BioBERT** | EN | 110M | BERT fine-tuned pe PubMed + PMC | Gratuit (rulează pe CPU) |

---

## 🗣️ Speech-to-Text Medical

| Model | Limbi | Specializare | Preț |
|-------|-------|-------------|------|
| **Deepgram Nova-3 Medical** | **EN only** | Terminologie medicală, medicamente, anatomie | **$0.0043/min** ($0.26/oră) |
| **Deepgram Nova-3** | 30+ limbi incl. **RO** | General, nu medical-specific | **$0.0043/min** ($0.26/oră) |
| **Google Chirp 2** | 100+ limbi incl. **RO** | Cel mai bun STT general, bun pe medicală | **$0.016/min** ($0.96/oră) |
| **Whisper Large v3** | 100+ limbi incl. **RO** | Open-source, excelent pe română | **Gratuit** (self-hosted, GPU ~$0.30/oră) |
| **Azure Speech (Custom)** | 30+ limbi incl. **RO** | Trainabil cu terminologie medicală custom | **$0.016/min** + $1.40/oră custom model |
| **Nuance DAX / Dragon Medical** | EN, DE, FR, ES | Gold standard medical STT (folosit în spitale) | **~$300-500/lună/medic** (enterprise) |
| **AWS Transcribe Medical** | **EN only** | Optimizat pentru consultații medicale | **$0.0125/min** ($0.75/oră) |
| **Suki AI** | **EN only** | AI scribe medical dedicat | **~$300/lună/medic** (SaaS) |

---

## 💰 Estimare Cost per Consultație (30 min)

| Componentă | Opțiune Ieftină | Opțiune Mid | Opțiune Premium |
|-----------|----------------|-------------|-----------------|
| **STT (transcriere)** | Deepgram: $0.13 | Google Chirp: $0.48 | Nuance DAX: ~$10 |
| **LLM (analiză + note)** | Gemini Flash: $0.01 | Claude Sonnet: $0.10 | GPT-4o: $0.15 |
| **Total per consultație** | **~$0.14** | **~$0.58** | **~$10+** |
| **Total 20 consultații/zi** | **~$2.80/zi** | **~$11.60/zi** | **~$200+/zi** |
| **Total lunar (22 zile)** | **~$62/lună** | **~$255/lună** | **~$4,400+/lună** |

---

## 📌 Concluzii pentru MindCare

- **Setup actual:** Deepgram Nova-3 + Claude Sonnet 4 → **~$0.58/consultație** → **~$255/lună** (20 consultații/zi)
- **Setup economic:** Deepgram Nova-3 + Gemini 2.5 Flash → **~$0.14/consultație** → **~$62/lună**
- **Pentru română medicală (LLM):** **BioMistral-7B-DARE** (singurul open-source cu suport RO) sau **Claude Sonnet** (cel mai bun raționament multilingv)
- **Pentru STT română:** **Deepgram Nova-3** cu `language: ro` sau **Google Chirp 2** pentru calitate superioară
- **Pentru engleză medicală:** **OpenBioLLM 70B** (open-source) sau **Med-PaLM 2** (closed)
- **Pentru STT engleză medicală:** **Deepgram Nova-3 Medical** — cel mai bun raport calitate/preț
