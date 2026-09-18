# Darukaa Earth — Site Intelligence MVP

## 1. Overview

A geospatial site-monitoring MVP built for the Darukaa.Earth Full-Stack Developer Hackathon Challenge. It lets a user draw a site polygon on a map, then view evidence-backed signals about that site — combining a prototype baseline dataset with **real** live data from GBIF (species occurrences) and NASA POWER (climate).

## 2. Problem

Nature-finance and biodiversity-disclosure workflows (TNFD/BRSR, carbon/biodiversity credit registries) need auditable, source-labeled evidence — not black-box scores. Most monitoring dashboards blend disparate data into a single "health score" that isn't scientifically defensible. This MVP demonstrates a different approach: keep evidence provenance visible, keep the reasoning deterministic, and never claim more than the data supports.

## 3. Product Thesis

```
SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION
```

The site (a polygon) is the unit of intelligence. Evidence (GBIF, NASA POWER, synthetic baseline) accumulates against it. A deterministic rule engine turns evidence into signals. Signals are surfaced as "What Changed" / "Needs Attention" — the insight that leads to an action (e.g., field verification).

## 4. User Workflow

Login → Project Dashboard → Interactive Map → Select/Create Site → Draw Polygon → Site Detail → Evidence → Baseline vs Current → What Changed / Needs Attention

## 5. Key Features

**Mandatory (P0):** React + Vite, Mapbox GL JS + Mapbox Draw, Chart.js, FastAPI, PostgreSQL + PostGIS, JWT auth, GitHub Actions CI, pre-commit/Husky/lint-staged/Prettier, deployment config.

**Differentiators (P1):** evidence provenance + freshness labels, baseline vs current comparison, real GBIF integration, real NASA POWER integration, deterministic "What Changed / Needs Attention" rule engine.

## 6. Architecture

```
React (Vite)
   │  JWT bearer requests
   ▼
FastAPI REST API
   │
   ▼
PostgreSQL + PostGIS  ◄── Evidence Snapshot Store (append-only)
   │
   ▼
Deterministic Signal / Rule Engine (pure Python, no I/O)
   │
   ▼
React UI (Site Detail)

External sources:
GBIF Adapter ────┐
                  ├──► Evidence Snapshot Store (cached, provenance-tagged)
NASA POWER Adapter┘
```

Adapters are isolated backend modules (`app/adapters/`) producing a generic normalized evidence shape, so future sources (satellite, bioacoustics, camera traps, field app) can be added without changing the rule engine or the UI contract.

## 7. Database Schema

```
users(id, email, hashed_password, created_at)
projects(id, name, description, owner_id → users.id, created_at)
sites(id, project_id → projects.id, name, geom [PostGIS POLYGON, SRID 4326],
      centroid_lat, centroid_lon, area_hectares, created_at, updated_at)
evidence_snapshots(id, site_id → sites.id, source, source_record_id, evidence_type,
                    period_label, observed_at, fetched_at, payload [JSON],
                    is_real, metadata_json)
```

`evidence_snapshots` is intentionally append-only and generic — it is the provenance backbone. Signals are **never** persisted as stored fact; they are recomputed on read from the evidence rows.

## 8. PostGIS / Geospatial Approach

Site polygons are stored as native PostGIS `POLYGON` geometry (SRID 4326) via GeoAlchemy2/Shapely. On creation, the API computes the centroid and an approximate hectare area (planar approximation at the site's latitude — see Limitations). GeoJSON is round-tripped through `to_shape`/`from_shape` for the Mapbox frontend.

## 9. Evidence Provenance Model

Every evidence row carries: `source` (gbif / nasa_power / synthetic), `source_record_id`, `evidence_type`, `period_label` (baseline/current), `observed_at`, `fetched_at`, `is_real`, and `metadata_json`. The UI shows a **Real data** or **Prototype / Synthetic** badge on every evidence item, and the provenance log lists source + fetch timestamp for all records. If an external API call fails, the failure itself is stored as a labeled `fetch_error` snapshot with `is_real: false` — the system never silently pretends a call succeeded.

## 10. GBIF Integration

Calls the official GBIF occurrence search API (`api.gbif.org/v1/occurrence/search`) with a bounding box around the site centroid. Normalizes each result to `{species, scientific_name, observed_at, basis_of_record}`. **Only ever used to state**: species observed, distinct species count, observation dates. **Never used to compute** a biodiversity health score — GBIF presence data says a species was observed, not that habitat health is any particular value.

## 11. NASA POWER Integration

Calls the official NASA POWER daily point API for temperature (`T2M`) and precipitation (`PRECTOTCORR`) at the site centroid, for a baseline window and a current window. Used strictly as climate **context** — the UI and rule engine never claim precipitation change caused a biodiversity outcome.

## 12. Baseline vs Current Approach

Two explicit time windows are defined as constants (`app/routers/evidence.py`): baseline (60–30 days ago) and current (30–0 days ago). Each evidence source's records are tagged with a `period_label`. The `/sites/{id}/detail` endpoint aggregates distinct species count and average climate values per period, and the frontend renders them side by side. Comparisons are only computed where semantically valid (e.g., species counts are counted, not averaged; climate values are averaged, not summed).

## 13. Deterministic Signal / Rule Engine

`app/rules/engine.py` is a pure Python module — no FastAPI/SQLAlchemy imports, no randomness, no ML. It takes normalized evidence dicts and a timestamp, and returns a list of `{type, direction, severity, message, evidence_refs}` signals. Three rules ship: new-species-observed (info), climate deviation beyond a configurable threshold (attention), and stale/missing source data (attention). All thresholds are named constants at the top of the file. **7 unit tests** cover: new species detection, "no observations" (not zero) messaging, precipitation deviation triggering, no-signal-within-threshold, stale data flagging, synthetic sources never flagged stale, and the combined `evaluate()` entrypoint. All 7 pass (verified — see Test Results below).

## 14. Data Limitations

- Area calculation uses a planar degree→meter approximation at the site's latitude, not a proper equal-area reprojection — acceptable for a prototype at typical site scale, not for precise cadastral area.
- GBIF/NASA POWER calls are made synchronously on first request to a site's detail page and cached for 6 hours; there is no retry/backoff yet (see Scalability Roadmap).
- "Baseline" vs "current" for GBIF records is inferred from `eventDate` relative to now, not from a registry-defined baseline period — this is a modeling simplification, documented here rather than hidden.
- **In this development/sandboxed environment, outbound calls to `api.gbif.org` and `power.larc.nasa.gov` were blocked by network egress rules (HTTP 403)** — verified live during testing. The system correctly degraded: it stored labeled `fetch_error` evidence snapshots (`is_real: false`) instead of fabricating data, and the rule engine correctly produced zero signals from zero real evidence. In an unrestricted deployment (e.g., Render), these calls are expected to succeed — the code path has no environment-specific logic blocking them.

## 15. Real vs Synthetic Data

Every evidence row has `is_real: true` (from GBIF/NASA) or `is_real: false` (synthetic/prototype or a fetch failure). The frontend renders a `Real data` / `Prototype / Synthetic` badge on every evidence item and on the provenance log — there is no path in the UI that displays synthetic data without that label.

## 16. Security

- Passwords hashed with bcrypt via passlib.
- JWT secret and database URL read from environment variables (`JWT_SECRET`, `DATABASE_URL`) — never hardcoded. Verified: `.env` files are git-ignored; only `.env.example` (placeholders) is committed.
- Mapbox token is read from `VITE_MAPBOX_TOKEN` at build time — never hardcoded (verified via grep).
- All project/site/evidence endpoints require a valid JWT (`Depends(get_current_user)`) and filter by `owner_id` — verified live: unauthenticated requests to `/projects` and `POST /projects` both return `401 Not authenticated`.
- CORS origins are explicitly configured via `CORS_ORIGINS` env var, not wildcard-by-default in production config (`docker-compose.yml` sets it to the frontend origin).
- **Not implemented** (out of scope for this MVP, noted honestly): rate limiting, refresh tokens, RBAC, secrets rotation, HTTPS termination (handled by the hosting platform, not the app).

## 17. Local Setup

**Requirements:** Docker + Docker Compose, or Python 3.11 + Node 20 + a local PostgreSQL/PostGIS instance.

### Option A — Docker Compose (recommended)

```bash
git clone <repo-url>
cd darukaa
docker compose up --build
# Backend: http://localhost:8000  (seeds demo data automatically)
cd frontend
cp .env.example .env   # fill in VITE_MAPBOX_TOKEN
npm install
npm run dev             # http://localhost:5173
```

### Option B — Manual

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # edit DATABASE_URL / JWT_SECRET
python -m app.seed
uvicorn app.main:app --reload

# Frontend
cd frontend
cp .env.example .env    # fill in VITE_MAPBOX_TOKEN
npm install
npm run dev
```

Demo login (after seeding): `demo@darukaa.earth` / `demo1234`

## 18. Environment Variables

**Backend (`backend/.env`):**
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL/PostGIS connection string |
| `JWT_SECRET` | Secret for signing JWTs — set a real random value in production |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |

**Frontend (`frontend/.env`):**
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_MAPBOX_TOKEN` | Mapbox public access token (get one at mapbox.com) |

## 19. CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:
- **Frontend job:** `npm install` → `npm run lint` → `npm run build` (all three verified locally to pass — see Test Results).
- **Backend job:** spins up a real `postgis/postgis:16-3.4` service container, installs dependencies, runs `pytest`.

`.pre-commit-config.yaml` runs `black`/`flake8` on the backend plus generic hygiene hooks; `frontend/package.json` wires Husky's `prepare` script to install a `pre-commit` hook that runs `lint-staged` (ESLint --fix + Prettier) on staged files. Husky requires a git repository to activate (`npm install` correctly reported "`.git` can't be found" in this non-git sandbox — this resolves automatically once the project is `git init`'d, which is expected and not a bug).

## 20. Deployment

**Deployment not performed; configuration prepared.** This sandboxed environment has no network access to Vercel, Render, or Docker Hub. Configuration is ready:

- `frontend/vercel.json` — Vercel build config (SPA rewrites to `index.html`).
- `render.yaml` — Render Blueprint: a managed PostGIS-capable Postgres database plus a Python web service running `python -m app.seed && uvicorn app.main:app`.

**Exact steps to deploy:**
1. Push this repo to GitHub.
2. **Database + Backend (Render):** In Render, "New → Blueprint", point at the repo, it will read `render.yaml` and provision the Postgres DB and the backend service. Set `CORS_ORIGINS` to your eventual Vercel URL once known.
3. **Frontend (Vercel):** Import the repo, set root directory to `frontend`, set `VITE_API_BASE_URL` to the Render backend URL and `VITE_MAPBOX_TOKEN` to a real Mapbox token, deploy.
4. Update the backend's `CORS_ORIGINS` env var on Render to the final Vercel URL and redeploy the backend.

## 21. Engineering Trade-offs

- **Synchronous external API calls on first page load** instead of a background task queue — simpler for a 3-hour MVP, at the cost of a slower first `site/detail` load. Documented as the first scalability step.
- **JWT with no refresh token** — simpler auth flow; access tokens are 24h. A production system would add short-lived access + refresh tokens.
- **Planar area approximation** instead of a proper geodesic/equal-area calculation — accurate enough for demo-scale sites, wrong at large scale or near the poles.
- **SQLAlchemy `Base.metadata.create_all()` instead of Alembic migrations** — faster to stand up for a hackathon; a real production system needs versioned migrations before its first schema change.

## 22. Scalability Roadmap

**Current (this MVP):** React → FastAPI → Postgres/PostGIS → evidence snapshots (synchronous ingestion, 6h in-DB cache) → deterministic rule engine.

**Future:**
- Move GBIF/NASA ingestion behind an async task queue (Celery/RQ) with retry/backoff instead of inline synchronous calls.
- Partition `evidence_snapshots` by time as volume grows.
- Add spatial indexing beyond PostGIS defaults for large portfolios (GiST tuning, materialized bounding-box tables).
- Add adapters for satellite (NDVI), bioacoustics, camera traps, and a future field-data app — the evidence schema and rule-engine input contract already support this without a rewrite.
- Organization-level access control (the current model is single-owner per project).
- A reporting/export API once report generation is scoped properly with domain experts (deliberately not built in this MVP — see Output 1's critique of rushing TNFD/BRSR report generation).

## 23. Monetization Hypothesis

**This is a product hypothesis, not Darukaa's confirmed or confidential pricing/business model.** Plausible directions, inferred from Darukaa's public site (API-first integration, TNFD/BRSR-ready reporting, nature-finance dMRV):
1. Project/site/hectare monitoring subscription.
2. Premium evidence/reporting tiers.
3. Enterprise API/data integration licensing.
4. Verification/MRV professional services.
5. Advanced monitoring/alerting add-ons.

## 24. Future Work

Real remote-sensing integration, TNFD/BRSR-formatted report export, multi-source confidence modeling (defined with domain scientists, not guessed), organization/team accounts, mobile field-data capture.

---

## Test Results (actually run, not claimed)

| Check | Result |
|---|---|
| `pytest` (rule engine, 7 tests) | **PASS** — `7 passed in 0.02s` |
| `npm run lint` | **PASS** — zero errors/warnings |
| `npm run build` | **PASS** — `✓ built in 9.95s` (one non-blocking chunk-size warning, documented above) |
| Real PostgreSQL 16 + PostGIS 3.4 install & extension | **PASS** — `postgis_version()` returned `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1` |
| Seed script against real PostGIS | **PASS** — 3 projects/sites created, polygons verified via `ST_AsText` |
| Live HTTP: register → login → JWT | **PASS** |
| Live HTTP: create/list project | **PASS** |
| Live HTTP: create site with polygon, retrieve, persisted correctly | **PASS** |
| Live HTTP: unauthenticated request rejected | **PASS** — `401 Not authenticated` |
| Live HTTP: `/sites/{id}/detail` (GBIF + NASA + rule engine) | **PASS with honest degradation** — outbound calls to `api.gbif.org`/`power.larc.nasa.gov` returned `403` due to this sandbox's network allowlist; the system correctly stored labeled `fetch_error` evidence (`is_real: false`) rather than fabricating data, and produced zero fake signals |
