# Smart Resource Allocation (SRA) — Master Blueprint

> **Document Type:** Production-Grade Architecture & Design Specification
> **Project Codename:** SRA — Smart Resource Allocation
> **Theme:** Data-Driven Volunteer Coordination for Social Impact
> **Document Owner:** Lead Architect
> **Status:** Source of Truth — refer to this document for all design, implementation, and scope decisions.

---

## 1. EXECUTIVE SUMMARY

### 1.1 North Star Vision

> **"Reduce the median time between 'a need is observed in the field' and 'a qualified volunteer is en route' from days to under two hours — measurably, ethically, and even when the internet doesn't work."**

Smart Resource Allocation is not another volunteer app and not another NGO dashboard. It is the **nervous system** for grassroots humanitarian work: an AI-mediated coordination fabric that transforms raw, messy ground-level observations into prioritized, matched, verified interventions.

### 1.2 The Core Problem

Local NGOs and social groups already collect critical data through paper surveys, voice notes, and field reports. But the data is:

- **Scattered** across notebooks, phones, and WhatsApp threads.
- **Unstructured** — impossible to aggregate or prioritize at scale.
- **Unverified** — no trust model, no deduplication, no audit trail.
- **Disconnected from action** — coordinators drown in noise while volunteers wait idle.

The bottleneck in grassroots impact is **not goodwill or effort — it is coordination.**

### 1.3 The Signal-to-Action Value Proposition

SRA compresses a multi-day, manual, error-prone workflow into a continuous, observable, AI-accelerated pipeline:

| Stage | Traditional NGO Workflow | SRA Workflow |
|---|---|---|
| **Signal** | Paper survey, voice note, rumor | Multimodal capture, offline-first, geo-tagged |
| **Understanding** | Manual transcription, days later | AI extraction to structured JSON in seconds |
| **Prioritization** | Gut feeling, loudest voice wins | Transparent, explainable Impact Score |
| **Matching** | WhatsApp broadcast, first-come first-served | Multi-criteria optimized matching |
| **Action** | Untracked, unverified | Geo-verified check-in, AI-verified proof |
| **Learning** | None | Every resolved incident trains the system |

### 1.4 Strategic Positioning

- **Not** a CRUD app for NGOs.
- **Not** a task assignment tool.
- **Is** a three-tier ecosystem sitting on a single AI intelligence core — the **coordination fabric** that grassroots social impact has always needed.

---

## 2. SYSTEM ARCHITECTURE

SRA is designed as a **layered, event-driven architecture**. Each layer is independently testable, replaceable, and horizontally scalable. The system communicates internally through a domain event bus, not through tight coupling.

### 2.1 Layer 1 — Edge / Capture Layer

**Responsibility:** Get signal out of the field, reliably, even under adverse conditions.

**Components:**
- **Field Worker PWA** — installable, offline-first, low-bandwidth optimized.
- **Local Queue** — IndexedDB-backed conflict-free submission queue.
- **Background Sync Worker** — uploads pending submissions when connectivity returns, with exponential backoff.
- **On-Device Pre-Processing** — image compression, audio chunking/opus encoding, language-hint detection.
- **Mesh Peer Sync (Innovation)** — Bluetooth/Wi-Fi Direct peer-to-peer sync when no device has connectivity; one connected device uploads the pooled batch.

**Design Principles:**
- Capture must **never fail** from the user's perspective. If upload is impossible, queue locally and confirm receipt.
- Initial PWA payload budget: **under 2 MB** to respect low-end device realities.
- Icon-first, voice-first UI to remain usable by users with basic literacy.

### 2.2 Layer 2 — Ingestion & Normalization Gateway

**Responsibility:** Accept, validate, deduplicate, and route incoming signals.

**Components:**
- **API Gateway** — authentication, rate limiting, request validation.
- **Media Handling Service** — raw media (images, audio) routed to object storage (S3 / Cloudinary / Firebase Storage). Only pointers are stored in the operational database.
- **Ingestion Queue** — a message queue (Redis + BullMQ or equivalent) decouples ingestion from processing.
- **Deduplication Guard** — content-hash check to prevent double-submits from retrying offline clients.

**Design Principles:**
- The gateway acknowledges "received and queued" immediately. All heavy lifting is asynchronous.
- Media is never stored in MongoDB; MongoDB holds structured metadata only.

### 2.3 Layer 3 — AI Intelligence Core

**Responsibility:** The crown jewel. Convert raw signal into structured, scored, clustered, and matchable intelligence.

**Sub-Pipelines (each independently deployable):**
1. **Extraction Pipeline** — multimodal (image + audio + text) → structured JSON with per-field confidence scores.
2. **Enrichment Pipeline** — reverse geocoding, translation, category normalization, urgency calibration.
3. **Clustering Pipeline** — groups near-duplicate reports into single logical incidents using vector similarity over text + spatial + temporal proximity.
4. **Scoring Pipeline** — computes the composite Impact Score with full explainability trace.
5. **Matching Pipeline** — multi-criteria volunteer ↔ task optimization.
6. **Verification Pipeline** — vision-based proof-of-completion checks.
7. **Prediction Pipeline** — historical pattern + external signal forecasting for Predictive Need Allocation.
8. **Conversational Assistant** — natural-language query interface over operational data for coordinators.

**Design Principles:**
- The AI core is **replaceable**. A different model provider must be swappable without touching domain services.
- **Model cascading**: cheap models handle high-confidence cases; premium models are reserved for ambiguous or high-stakes cases.
- **Graceful degradation**: if the AI core is unreachable, submissions still queue and humans can triage manually. The system never hard-fails on AI unavailability.

### 2.4 Layer 4 — Domain Services

**Responsibility:** Encode the business logic of humanitarian coordination.

**Services:**
- **Incident Service** — owns the lifecycle: `reported → triaged → assigned → in_progress → resolved → verified → closed`.
- **Volunteer Service** — profiles, skills, availability, workload, wellness state.
- **Resource Inventory Service** — tracks what supplies exist, where, and their depletion curve.
- **Notification Service** — push notifications with SMS and WhatsApp fallback for low-connectivity volunteers.
- **Trust Service** — maintains the Trust & Verification Graph for field workers and citizen reporters.

**Design Principles:**
- Each domain service owns its own data model and publishes events on state change.
- No service directly queries another service's database. Communication happens through APIs or events.

### 2.5 Layer 5 — Presentation Layer

**Responsibility:** Deliver the right experience to each of the three user tiers.

**Interfaces:**
- **Field Worker PWA** — capture-optimized, offline-first.
- **Coordinator Dashboard** — decision-making command center with heatmap, review queue, resource panel, and conversational assistant.
- **Volunteer PWA** — execution-optimized, notification-driven, proof-capturing.

**Design Principles:**
- All three share a single design system but diverge sharply in information density and interaction model.
- Real-time updates delivered via WebSocket or Server-Sent Events.

### 2.6 Cross-Cutting Concerns

#### Event Bus (Domain Events)
All state changes emit domain events:
- `ReportReceived`
- `IncidentCreated`
- `IncidentClustered`
- `IncidentScored`
- `IncidentTriaged`
- `VolunteerAssigned`
- `VolunteerCheckedIn`
- `IncidentResolved`
- `ProofVerified`
- `VolunteerWellnessFlagged`

**Why this matters:** the event log becomes the append-only source of truth, enabling replay, audit, analytics, and future integrations without modifying core logic.

#### Privacy-at-Read-Boundary (Not Write-Boundary)
Raw data is preserved encrypted for auditability. **Sanitization happens at the read layer, per role.** A coordinator sees anonymized markers with spatial jitter; a compliance auditor (with appropriate permission) can see the underlying record. This is safer than destructively stripping data on ingestion and enables role-based redaction.

#### Observability
Structured logging, distributed tracing across AI pipelines, and health probes on every service. Every AI decision is logged with inputs, outputs, model version, and confidence — the system is **auditable by design**.

#### Security & Consent
- Consent capture is a first-class action in the field worker flow.
- PII is encrypted at rest and in transit.
- Role-based access control with least privilege defaults.
- Compliance posture: DPDP (India) and GDPR (EU) compatible.

---

## 3. DATA MODELS & SCHEMA (High-Level)

> This section describes the logical shape of the data, not its implementation. Field names are illustrative.

### 3.1 `reports` Collection (Raw Signal)

A `report` represents a single atomic submission from a field worker. Multiple reports can be clustered into one incident.

**Logical fields:**
- Identity: `report_id`, `worker_id`, `submitted_at`, `received_at`
- Raw payload pointers: `media_refs` (object storage URIs for images/audio), `original_text`
- Capture context: `gps_coordinates`, `device_id`, `connectivity_mode` (direct / mesh-relayed)
- Extraction output: `extracted_fields` (category, urgency, people_affected, resource_needed, location), each with `confidence` and `model_version`
- Processing state: `status` (`queued`, `processing`, `extracted`, `clustered`, `review_required`, `discarded`)
- Linkage: `incident_id` (populated after clustering)
- Trust metadata: `worker_trust_score_at_submission`
- Dedup key: `content_hash`

### 3.2 `incidents` Collection (Clustered Logical Events)

An `incident` represents a real-world situation requiring response. It is formed by clustering one or more reports.

**Logical fields:**
- Identity: `incident_id`, `created_at`, `last_updated_at`
- Aggregated context: `category`, `severity`, `estimated_people_affected`, `resource_needs[]`, `location_centroid`, `location_bounds`
- Source reports: `contributing_report_ids[]` (enables auditability — which field observations built this picture?)
- Scoring: `impact_score` with full `score_breakdown` (severity, vulnerability, decay, scarcity, historical multipliers)
- Lifecycle: `status` (`reported → triaged → assigned → in_progress → resolved → verified → closed`)
- Assignment: `assigned_volunteer_ids[]`, `assignment_history[]`
- Resolution: `resolution_proof_refs[]`, `verification_status`, `resolved_at`
- Escalation state: `escalation_level`, `escalation_history[]`
- Privacy: `sanitized_location` (jittered coordinates for map display)

### 3.3 `volunteers` Collection

**Logical fields:**
- Identity: `volunteer_id`, `name`, `contact_channels` (push, SMS, WhatsApp)
- Capability: `skills[]`, `certifications[]`, `languages[]`, `transportation_mode`
- Availability: `availability_windows[]`, `current_status` (`available`, `assigned`, `resting`, `offline`)
- Location: `last_known_location`, `service_radius`
- Workload: `active_assignments[]`, `hours_last_7_days`, `consecutive_high_urgency_count`
- Wellness: `wellness_score`, `wellness_flags[]`, `mandatory_rest_until`
- Trust: `completion_rate`, `verification_pass_rate`, `trust_score`
- History: `total_assignments`, `total_resolved`, `joined_at`

### 3.4 `resources` Collection (Inventory)

**Logical fields:**
- Identity: `resource_id`, `name`, `category`
- Quantity: `available_quantity`, `reserved_quantity`, `reorder_threshold`
- Location: `storage_location`, `custodian_id`
- Lifecycle: `expiry_date` (for perishables), `last_audited_at`
- Linkage: `committed_to_incidents[]`

### 3.5 `trust_graph` Collection (Innovation)

**Logical fields:**
- Subject: `entity_id`, `entity_type` (field worker, citizen reporter)
- Trust score: `current_score`, `score_history[]`
- Signals: `reports_submitted`, `reports_verified_true`, `reports_flagged_false`, `admin_overrides`
- Policy flags: `auto_approve_eligible`, `review_required`, `suspended`

### 3.6 `events` Collection (Append-Only Event Log)

Immutable log of every domain event. Source of truth for analytics, replay, and audit.

### 3.7 `wellness_log` Collection

Time-series record of volunteer workload and wellness signals, feeding the Burnout Prevention Engine.

---

## 4. THE AI PIPELINE

The AI Intelligence Core is the strategic differentiator of SRA. This section details the logic of its three most critical pipelines.

### 4.1 Multimodal Extraction

**Input:** One or more of — image, audio, text — plus capture context (GPS, timestamp, device, worker identity).

**Processing stages:**
1. **Modality routing** — determine which sub-models to invoke based on payload types.
2. **Audio transcription** — speech-to-text with language detection; emotional tone cues captured as urgency signals.
3. **Vision analysis** — object detection (people, injuries, damage, supplies) and scene classification.
4. **Text understanding** — handles native language and code-mixed input (e.g., Hinglish).
5. **Cross-modal fusion** — reconcile potentially conflicting signals from different modalities.
6. **Structured output generation** — populate the canonical schema with per-field confidence scores.
7. **Confidence gating** — records with any critical field below threshold are flagged for human review rather than auto-processed.

**Critical design decisions:**
- **Confidence is first-class.** Every extracted field carries its own confidence score.
- **Human edits become training signal.** When a coordinator corrects a low-confidence extraction, the correction is logged for future model improvement.
- **Language coverage** must include local Indian languages via integration with Bhashini / AI4Bharat or equivalents for non-English regions.

### 4.2 Impact Scoring (Composite Formula)

The Impact Score is intentionally **transparent and explainable** — every coordinator must be able to see *why* one incident outranks another.

**Composite Formula (logical):**

```
ImpactScore =
    (Severity × W_severity)
  + (PeopleAffected_normalized × W_people)
  + (VulnerabilityMultiplier × W_vulnerability)
  + (TimeDecayFactor × W_decay)
  + (ResourceScarcityFactor × W_scarcity)
  + (HistoricalPatternMatch × W_history)
```

**Component definitions:**
| Component | Meaning | Source |
|---|---|---|
| **Severity** | Normalized 0–1 severity from AI classification | Extraction pipeline |
| **PeopleAffected** | Logarithmically scaled count (to prevent 1000-person events dominating 10-person events entirely) | Extraction pipeline |
| **VulnerabilityMultiplier** | Boost when children, elderly, disabled, pregnant women, or other vulnerable groups are mentioned | Extraction + keyword rules |
| **TimeDecayFactor** | Older unaddressed incidents escalate over time; ensures nothing is forgotten | Incident age |
| **ResourceScarcityFactor** | If the required resource is low in inventory, urgency increases | Resource service |
| **HistoricalPatternMatch** | If this area/category has recurring issues, boost for pattern recognition | Prediction pipeline |

**Weights (`W_*`)** are configurable per-NGO and per-deployment context. Defaults are tuned for general humanitarian response; a disaster-specific deployment may re-weight heavily toward severity and people affected.

**Explainability requirement:** every score is stored alongside its breakdown. The coordinator dashboard displays a "Why this score?" panel on every incident.

### 4.3 Incident Clustering

**Problem solved:** Five field workers reporting the same flood should not create five tasks. The clustering pipeline collapses near-duplicate reports into single logical incidents while preserving the audit trail.

**Algorithm (logical):**
1. Generate a composite embedding from each incoming report combining:
   - Text embedding of extracted description + category
   - Spatial proximity (lat/lng)
   - Temporal proximity (submitted_at)
2. Query the active incidents set (status in `reported`, `triaged`, `assigned`, `in_progress`) within a spatial window (default 500m) and a temporal window (default 2 hours).
3. Compute similarity against each candidate.
4. **If similarity exceeds threshold:** attach the report to the existing incident, re-aggregate counts, re-score impact.
5. **Otherwise:** create a new incident with this report as the seed.

**Why this matters:**
- Prevents coordinator overload from duplicate noise.
- Strengthens each incident's picture — multiple angles, photos, and corroborating detail.
- Enables **corroboration scoring**: an incident backed by five independent field workers is inherently more trustworthy than one backed by a single report.

### 4.4 Supporting Pipelines (Summary)

| Pipeline | Role | Key Output |
|---|---|---|
| **Enrichment** | Geocoding, translation, taxonomy normalization | Canonicalized incident fields |
| **Matching** | Multi-criteria optimization (skill × proximity × availability × urgency × fairness) | Ranked volunteer candidates |
| **Verification** | Vision check on proof photos | Pass / fail / manual review |
| **Prediction** | Forecasts future needs from historical + external signals | Pre-staging recommendations |
| **Conversational Assistant** | Natural language → operational query | Dashboard answers on demand |

---

## 5. USER JOURNEYS

### 5.1 Field Worker Journey

**Persona:** A community health worker in a rural district with intermittent connectivity and a basic Android device.

1. **Open PWA** — loads instantly from local cache, even offline.
2. **Start new report** — single-tap entry from home screen.
3. **Choose modality** — camera, voice, text, or combo. Large icons, minimal reading required.
4. **Capture** — take photo of a handwritten survey, record a short voice note, or dictate.
5. **Auto-context capture** — GPS, timestamp, worker identity attached automatically.
6. **Review screen** — minimal, icon-based confirmation. One tap to submit.
7. **Queue confirmation** — UI immediately shows "Queued — will sync when online." No anxiety about lost data.
8. **Background sync** — when connectivity returns, upload happens silently with retry.
9. **Mesh fallback** — if no connectivity and no chance of it soon, the device attempts Bluetooth/Wi-Fi Direct sync with nearby SRA devices; one connected device eventually carries the pooled payload.
10. **Acknowledgment** — once the server confirms receipt, the report in the local queue is marked delivered. The worker sees a small green tick.

**Key UX principles:**
- Zero friction to capture. The hardest UX problem in field work is making the tool feel lighter than a notebook.
- Never block on validation. Accept everything; let the AI pipeline and coordinator review handle cleanup.
- Offline is the default assumption, not the edge case.

### 5.2 Coordinator (Admin) Journey

**Persona:** An NGO program coordinator managing multiple field teams and volunteer cohorts across a city region.

1. **Login to dashboard** — loads situational overview: active incidents, active volunteers, resource status.
2. **Heatmap view** — clustered need visualization with sanitized (jittered) markers. Color-coded by Impact Score.
3. **Review queue** — low-confidence AI extractions flagged for human validation. Coordinator can correct fields with one click; corrections feed training data.
4. **Incident deep-dive** — open any incident to see:
   - Aggregated structured data
   - Contributing reports (with media)
   - Impact Score with full "Why?" breakdown
   - Candidate volunteers ranked by match score
5. **Assignment decision** — auto-assign (if above confidence threshold) or manually confirm.
6. **Conversational assistant** — ask in natural language: *"Show me all unresolved medical incidents in Zone 3 from the last 48 hours sorted by impact."*
7. **Resource panel** — monitor inventory, approve resource commitments to incidents.
8. **Volunteer wellness view** — see workload distribution and burnout flags; intervene before volunteers overextend.
9. **Escalation alerts** — notified when incidents fail to attract volunteers within the acceptance window.
10. **Impact reporting** — auto-generated weekly summaries for leadership and donors.

### 5.3 Volunteer Journey

**Persona:** A trained community volunteer with transportation, available on evenings and weekends.

1. **Profile setup** — skills, certifications, languages, transportation, availability windows.
2. **Receive smart notification** — push with SMS/WhatsApp fallback: "Medical support needed, 2.4 km away, high urgency. Accept?"
3. **Review task** — brief details, Impact Score, distance, estimated duration, beneficiary language.
4. **Accept** — first-to-accept within the window wins; others are released gracefully.
5. **Navigate** — one-tap maps integration to the sanitized location; exact coordinates revealed only on arrival proximity.
6. **Geo-verified check-in** — confirms physical arrival.
7. **Execute task** — follow task checklist; emergency contact available one tap away.
8. **Upload proof** — photo + optional note. AI verification runs in the background.
9. **Mark complete** — incident transitions to `resolved`; verification pipeline moves it to `verified` or `manual_review`.
10. **Wellness loop** — workload, consecutive high-urgency tasks, and travel distance are logged; if thresholds are crossed, the system suggests rest and temporarily withholds new assignments.

---

## 6. INNOVATION & ETHICS

SRA is differentiated not just by intelligence, but by its **ethical posture baked into architecture**. The innovations below are not add-ons — they are constitutive.

### 6.1 Burnout Prevention Engine (Wellness Score)

**Why:** Volunteer burnout is the silent killer of humanitarian initiatives. Star volunteers get overloaded, burn out, and disappear — leaving teams weaker than before they joined.

**How it works:**
- Every assignment, check-in, and completion updates the volunteer's workload profile.
- The **Wellness Score** aggregates:
  - Hours worked over rolling 7-day window
  - Consecutive high-urgency assignments
  - Night vs. day load balance
  - Travel distance accumulated
  - Self-reported stress (optional in-app pulse)
- When any signal crosses a threshold, the matching pipeline **hard-excludes** the volunteer from new assignments until mandatory rest completes.
- The coordinator dashboard surfaces wellness flags proactively.
- Optional: connect volunteers to peer-support chat and mental health resources.

**Design principle:** the system **refuses to let a volunteer work past safe limits**, even if the volunteer themselves is willing. Protecting helpers is as important as helping beneficiaries.

### 6.2 Trust & Verification Graph

**Why:** Scaling to citizen reporting and large volunteer bases requires a trust model — but one that scales without sacrificing quality or introducing bias.

**How it works:**
- Every entity that submits signal (field worker, citizen reporter) has a `trust_score`.
- New entities start with a neutral baseline and require light human review.
- Trust increases when submissions are:
  - Corroborated by other reports (clustering provides this signal for free)
  - Verified by coordinators without major edits
  - Followed by successful interventions
- Trust decreases when submissions are:
  - Flagged as false or malicious
  - Heavily edited by coordinators
  - Contradicted by on-ground verification
- High-trust entities are **auto-approved** (their reports bypass manual review).
- Low-trust entities are **shadow-queued** — their reports are processed but held for review.
- **Suspended entities** are excluded until a human unblocks them.

**Ethical guardrails:**
- Trust is never used to deny service to beneficiaries — only to gate the reliability of incoming signal.
- Trust decisions are logged and auditable.
- Appeals process: any entity can request review.

### 6.3 Privacy-at-Read-Boundary

**Why:** Destructive anonymization (stripping PII on ingestion) is lossy and irreversible. It also weakens audit and accountability. Privacy must be enforced **where data is consumed**, not where it is collected.

**How it works:**
- Raw data is stored encrypted, with full fidelity.
- Every read path passes through a **sanitization middleware** that applies role-based redaction:
  - Public / map view: jittered coordinates (±100m), no names, aggregated counts only.
  - Volunteer view: task-relevant details, precise location revealed only on proximity.
  - Coordinator view: full operational data, but beneficiary PII still masked unless explicitly needed.
  - Compliance auditor view: full record, with access logged.
- Privacy policy is enforced as code, not as process.

### 6.4 Mesh Mode (Offline Peer Sync)

**Why:** The last mile is real. In disaster zones and remote areas, connectivity is absent for hours or days. Any system that assumes internet is useless in the moments when it is needed most.

**How it works:**
- Field Worker devices with pending submissions attempt to discover nearby SRA devices over Bluetooth or Wi-Fi Direct.
- Submissions are exchanged peer-to-peer with cryptographic signing to preserve provenance.
- When any device in the mesh regains connectivity, it uploads the pooled batch to the gateway.
- The gateway deduplicates by content hash — no risk of the same report uploading twice from different mesh participants.
- Provenance is preserved: the original submitting worker's identity is retained regardless of which device carried it to the cloud.

**Strategic value:** transforms SRA from a connectivity-dependent tool into a **genuinely field-deployable system**. This is a major differentiator against any competitor.

### 6.5 Fairness in Matching

The matching pipeline includes a **fairness constraint**: the same few volunteers cannot be over-allocated. This prevents:
- Star-volunteer burnout (the problem the Wellness Engine also addresses from another angle).
- Skill atrophy in the broader volunteer base.
- Implicit bias toward volunteers who happen to have better phones or lived in denser areas.

### 6.6 Explainable AI Throughout

Every AI decision is:
- **Logged** with inputs, model version, outputs, and confidence.
- **Surfaced** in the UI with a human-readable rationale ("Why this score?", "Why this volunteer?").
- **Overridable** by humans, with overrides becoming training signal.

This is both an ethical imperative in mission-critical humanitarian work and a demonstrable differentiator for adoption by conservative NGO leadership.

---

## 7. DEVELOPMENT ROADMAP

> **Build horizon:** 4-week build window.
> **Philosophy:** Prove the spine end-to-end before thickening any single layer. A working signal-to-action pipeline in week 2 is more valuable than a polished dashboard in week 4 with nothing flowing through it.

### 7.1 Week 1 — Foundation & Spine

**MVP Goals:**
- Repository, environment, tooling, CI baseline.
- Data model skeletons for `reports`, `incidents`, `volunteers`, `resources`, `events`.
- Field Worker PWA shell with offline capture (text + image only, audio deferred).
- Ingestion gateway accepting submissions and queuing them.
- Basic end-to-end test: a submission flows from PWA → gateway → database.

**Key deliverables:**
- [ ] Monorepo structure finalized
- [ ] MongoDB schemas drafted
- [ ] PWA offline queue working with IndexedDB
- [ ] Ingestion gateway endpoint live
- [ ] Event bus conceptual wiring in place

### 7.2 Week 2 — Intelligence Core (MVP Depth)

**MVP Goals:**
- Extraction pipeline (Gemini or equivalent) converting image/text to structured JSON.
- Confidence scoring on extracted fields.
- Rule-based Impact Score (transparent formula, no ML training yet).
- Basic clustering (spatial + temporal window, similarity threshold).
- Coordinator dashboard skeleton: list of incidents, heatmap, review queue.

**Key deliverables:**
- [ ] Extraction pipeline integrated
- [ ] Impact Score formula computing and displaying
- [ ] Clustering pipeline operational
- [ ] Review queue UI for low-confidence extractions
- [ ] Heatmap visualization with sanitized markers

### 7.3 Week 3 — Action Layer

**MVP Goals:**
- Volunteer PWA: profile, notification, accept, navigate, check-in, proof upload.
- Matching pipeline: multi-criteria ranking (skill, proximity, availability).
- Notification service with push (SMS/WhatsApp deferred).
- Wellness Score v1: workload tracking and hard exclusion from matching when thresholds crossed.
- Trust score v1: baseline + manual admin adjustment.

**Key deliverables:**
- [ ] Volunteer PWA end-to-end flow
- [ ] Matching pipeline producing ranked candidates
- [ ] Push notifications working
- [ ] Wellness exclusion rule enforced
- [ ] Trust score visible on reports

### 7.4 Week 4 — Polish, Innovation, Demo

**MVP Goals:**
- Proof verification (vision check) on completion photos.
- Conversational assistant on the coordinator dashboard (natural-language queries).
- One signature innovation fully wired: **Mesh Mode proof-of-concept** or **Predictive Need Forecasting** — choose based on demo strategy.
- Impact metrics dashboard (operational + outcome KPIs).
- End-to-end demo script rehearsed and polished.

**Key deliverables:**
- [ ] Proof verification pipeline live
- [ ] Conversational assistant answering common queries
- [ ] Chosen innovation integrated and demonstrable
- [ ] Metrics dashboard populated
- [ ] Demo script finalized

### 7.5 MVP vs. Future Roadmap

| Capability | MVP (4 weeks) | Future Roadmap |
|---|---|---|
| Multimodal extraction | Image + text | Full audio with emotional cues |
| Impact Score | Rule-based formula | ML-trained weights per deployment |
| Clustering | Spatial + temporal window | Full vector embedding with learned thresholds |
| Matching | Multi-criteria ranking | Constrained optimization with fairness solver |
| Wellness Engine | Workload thresholds | Predictive burnout with mental-health integrations |
| Trust Graph | Manual + basic signals | Automated graph with appeal workflow |
| Mesh Mode | Proof-of-concept demo | Production-grade mesh protocol |
| Prediction | Deferred / mocked | Full historical + external signals model |
| Multi-tenant Federation | Not in MVP | NGO ecosystem cross-visibility |
| Resource Donor Matching | Not in MVP | Full resource market matching |
| Ghost-Needs Detection | Not in MVP | Silence-as-signal analytics |
| Citizen Reporting Tier | Not in MVP | WhatsApp bot integration |

### 7.6 Risks & Mitigations (Summary)

| Risk | Mitigation |
|---|---|
| AI cost explosion | Model cascading, content-hash caching, batching low-priority items |
| LLM hallucinations corrupt triage | Confidence scores + human review + auditable overrides |
| Volunteer gaming / fraud | Geo-verified check-in + AI proof verification + trust graph |
| Duplicate report flooding | Clustering pipeline with spatial + temporal deduplication |
| Privacy breach / PII leak | Read-boundary sanitization + encryption + role-based redaction |
| Connectivity failures | Offline queue + mesh sync + exponential backoff retry |
| Coordinator overload | Auto-approve thresholds + conversational assistant + smart defaults |
| Cold start (no historical data) | Public dataset seeding + rules-based mode until data accumulates |
| AI core outage | Graceful degradation to manual triage; submissions still queue |
| Multilingual accuracy gaps | Hybrid LLM + regional ASR (Bhashini / AI4Bharat) |

### 7.7 Impact Metrics (What We Measure)

| Category | Metric |
|---|---|
| **Operational** | Median time report → assignment |
| | Median time report → resolution |
| | % incidents auto-processed without human triage |
| | First-pass extraction accuracy |
| | Duplicate detection rate |
| **Outcome** | People served per week |
| | Resource utilization rate |
| | Geographic coverage vs. identified need zones |
| | Response equity (variance across zones) |
| **Volunteer Health** | Average workload per volunteer |
| | Burnout flag rate |
| | 90-day retention |
| | Wellness pulse satisfaction |
| **AI Quality** | Confidence distribution on extractions |
| | Admin override rate on AI decisions |
| | Prediction accuracy (forecast vs. actual) |
| **Trust & Safety** | Proof verification pass rate |
| | Low-trust flag rate |
| | Privacy incidents (target: 0) |

---

## Final Note from the Lead Architect

This document is the **single source of truth** for SRA. Before adding any feature, ask: *does it serve the North Star of compressing signal-to-action time, ethically and resiliently?* If not, it belongs in the future roadmap, not the MVP.

Our advantage is not the dashboard, the map, or the app — it is the **intelligence fabric** between unstructured reality and coordinated action, combined with a **deep respect for field conditions and volunteer wellbeing**. Every architectural decision in this document reinforces one of those two pillars.

Build the spine first. Earn the innovations. Ship something real.
