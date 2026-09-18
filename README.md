# Darukaa Earth — Site Intelligence

A production-oriented full-stack geospatial intelligence workspace for environmental project teams to manage projects, define geographical sites, inspect evidence, compare baseline and current observations, and surface transparent site-level changes that require attention.

> **Product principle:**  
> **SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION**

The application was built for the Darukaa.Earth Full-Stack Developer Hackathon Challenge, which requires project management, interactive Mapbox mapping, polygon-based site creation, data visualization, authentication, automated code-quality checks, CI/CD, and a publicly accessible deployment.

---

## 1. Why this product exists

Environmental and nature-related projects generate information from many different systems: geographical boundaries, biodiversity observations, climate datasets, field measurements, and monitoring tools.

The difficult product problem is not simply storing those records. It is helping a person answer:

- What site am I looking at?
- What evidence do we have for it?
- Where did the evidence come from?
- How recent is it?
- What has changed compared with the baseline?
- Does anything require human attention?

Darukaa Earth — Site Intelligence addresses this by treating the **site polygon as the primary unit of intelligence**.

The product intentionally avoids inventing a single environmental-health or biodiversity score from heterogeneous datasets. Instead, it preserves the underlying evidence, makes provenance visible, and uses deterministic rules to surface observable changes.

---

# 2. Product workflow

The primary end-to-end workflow is:

```text
Login
  ↓
Project Dashboard
  ↓
Select Project
  ↓
Project Map
  ↓
View existing sites / draw a new polygon
  ↓
Save Site
  ↓
Site Detail
  ↓
Evidence + Provenance
  ↓
Baseline vs Current
  ↓
What Changed
  ↓
Needs Attention
```

The intended outcome is a decision-ready site view rather than a dashboard full of disconnected metrics.

---

# 3. Core capabilities

## Authentication

- User registration
- JWT-based login
- Protected API requests
- Session/token persistence in the browser
- Logout
- Human-readable validation and API error handling

## Project management

- Create a project
- View project list
- Open a project workspace
- Associate multiple geographical sites with a project

## Geospatial site management

- Interactive Mapbox GL JS map
- Mapbox Draw polygon workflow
- Site polygon persistence in PostgreSQL/PostGIS
- Existing site boundaries rendered on the map
- Site selection from the map or project site list
- Responsive map layout so the map remains visible across screen sizes

## Site intelligence

- Site metadata and geographic context
- Evidence timeline
- Source and freshness/provenance information
- Baseline vs current comparison
- Deterministic "What Changed" signals
- Deterministic "Needs Attention" signals
- Interactive Chart.js visualizations
- Explicit differentiation between real external observations and synthetic/prototype data

---

# 4. Data strategy

The application deliberately separates data types instead of merging them into an unsupported score.

## GBIF — biodiversity occurrence evidence

GBIF is used for species occurrence information.

The product uses GBIF to answer questions such as:

> How many distinct species have been observed within the site context during the selected period?

It does **not** interpret occurrence records as a direct measurement of biodiversity health.

## NASA POWER — climate context

NASA POWER is used for climate/weather context such as:

- Temperature
- Precipitation

These values are presented as environmental context. The system does not claim that a climate observation caused a biodiversity outcome.

## Synthetic / prototype evidence

Seeded demonstration data is explicitly labelled as:

> **Prototype / Synthetic**

This prevents demonstration data from being mistaken for live field or external-source observations.

---

# 5. Evidence provenance

One of the core design decisions is to retain evidence provenance instead of presenting every value as if it were equally current or authoritative.

An evidence record can contain:

```text
source
source_record_id
evidence_type
period_label
observed_at
fetched_at
payload
is_real
metadata_json
```

The UI exposes this information so reviewers can see:

- where evidence came from
- when it was observed
- when it was fetched
- whether it is real external evidence or synthetic prototype data

This also creates a foundation for future data sources such as field observations, bioacoustics, camera traps, sensors, and remote sensing.

---

# 6. Baseline vs current

The MVP separates observations into two time windows:

```text
Baseline
Current
```

The comparison layer uses source-appropriate aggregation:

- biodiversity occurrence data → distinct observed species
- climate data → period averages
- timestamps → retained as provenance rather than flattened away

The "What Changed" layer is calculated from evidence rather than stored as a permanent fact, so new evidence can change the result without requiring a manual update to a precomputed conclusion.

---

# 7. Deterministic signal engine

The signal engine is implemented as a pure Python component.

It does not use:

- an LLM
- random scoring
- an arbitrary 0–100 health score
- unexplained confidence values

It produces structured, reproducible signals such as:

```text
New species observations detected
Climate deviation exceeds the configured threshold
Evidence is stale or missing
No observations available for the selected period
```

Each signal is intended to be understandable by a human reviewer.

The rule engine is isolated from FastAPI and database I/O so that the logic can be unit-tested independently.

---

# 8. System architecture

```text
                          ┌──────────────────────────────┐
                          │        React + Vite          │
                          │                              │
                          │ Dashboard                    │
                          │ Project Map                  │
                          │ Site Detail                  │
                          │ Chart.js                     │
                          │ Mapbox GL JS + Draw          │
                          └──────────────┬───────────────┘
                                         │
                                      REST/JWT
                                         │
                                         ▼
                          ┌──────────────────────────────┐
                          │          FastAPI              │
                          │                              │
                          │ Authentication               │
                          │ Projects                     │
                          │ Sites                        │
                          │ Evidence                     │
                          └───────┬────────────┬─────────┘
                                  │            │
                                  │            │
                                  ▼            ▼
                    ┌──────────────────┐   ┌─────────────────────┐
                    │ PostgreSQL       │   │ External Sources   │
                    │ + PostGIS        │   │                     │
                    │                  │   │ GBIF                │
                    │ Users            │   │ NASA POWER          │
                    │ Projects         │   └──────────┬──────────┘
                    │ Sites + polygons │              │
                    │ Evidence         │              ▼
                    └────────┬─────────┘    ┌─────────────────────┐
                             ▲              │ Source Adapters     │
                             │              │ Fetch → Normalize   │
                             │              │ → Store             │
                             │              └──────────┬──────────┘
                             │                         │
                             └─────────────────────────┘
                                       Evidence
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │ Deterministic Signal   │
                              │ / Rule Engine          │
                              │                        │
                              │ Baseline vs Current    │
                              │ Change Detection       │
                              │ Attention Signals      │
                              └────────────┬───────────┘
                                           │
                                           ▼
                                  Decision-ready UI
```

### Architectural principle

The application separates:

```text
Source ingestion
      ↓
Evidence storage
      ↓
Signal generation
      ↓
API layer
      ↓
UI
```

This makes the evidence model source-agnostic. A future adapter can normalize another environmental source into the same evidence structure without forcing a redesign of the downstream UI or rule engine.

---

# 9. Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Application UI |
| Build | Vite | Development and production build |
| Mapping | Mapbox GL JS | Interactive geospatial map |
| Drawing | Mapbox GL Draw | Polygon creation/editing |
| Visualization | Chart.js | Interactive site analytics |
| Routing | React Router | SPA navigation |
| HTTP | Axios | Frontend API client |
| Backend | FastAPI | REST API |
| Language | Python | Backend and rule engine |
| Authentication | JWT | API authentication |
| Database | PostgreSQL | Primary relational store |
| Spatial DB | PostGIS | Polygon and spatial data |
| ORM | SQLAlchemy + GeoAlchemy2 | Database access and geometry |
| Geometry | Shapely | Geometry manipulation |
| Testing | pytest | Backend/rule tests |
| Quality | ESLint, Prettier | Frontend quality |
| Git hooks | Husky, lint-staged | Pre-commit automation |
| CI | GitHub Actions | Automated validation |
| Frontend deployment | Vercel | Public web application |
| Backend deployment | Render | API + managed PostgreSQL/PostGIS |

---

# 10. Database schema

The primary relationships are:

```text
users
  │
  └── 1:N ──> projects
                 │
                 └── 1:N ──> sites
                                │
                                └── 1:N ──> evidence_snapshots
```

## users

Stores application identities.

```text
id
email
hashed_password
created_at
```

## projects

Represents a logical environmental/nature project.

```text
id
name
description
owner_id  → users.id
created_at
```

## sites

Represents a geographical monitoring site.

```text
id
project_id       → projects.id
name
geom             → PostGIS POLYGON, SRID 4326
centroid_lat
centroid_lon
area_hectares
created_at
updated_at
```

The polygon is stored as native PostGIS geometry rather than as unstructured JSON.

## evidence_snapshots

Stores normalized source evidence.

```text
id
site_id             → sites.id
source
source_record_id
evidence_type
period_label
observed_at
fetched_at
payload             → JSON
is_real
metadata_json       → JSON
```

The evidence table is intentionally generic so new source adapters can be introduced without changing the core site model.

---

# 11. API design

The frontend communicates with the FastAPI backend through a centralized API client.

Major resource groups:

```text
/auth
/projects
/sites
/evidence
```

Representative request flow:

```text
POST /auth/login
        ↓
JWT returned
        ↓
JWT attached to protected requests
        ↓
GET /projects
        ↓
GET /sites/by-project/{project_id}
        ↓
GET /sites/{site_id}/detail
```

Authentication is enforced server-side on protected project, site, and evidence operations.

---

# 12. Repository structure

```text
darukaa/
│
├── backend/
│   ├── app/
│   │   ├── adapters/
│   │   │   ├── gbif.py
│   │   │   └── nasa_power.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── db.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── sites.py
│   │   │   └── evidence.py
│   │   ├── rules/
│   │   │   └── engine.py
│   │   ├── tests/
│   │   │   └── test_rules.py
│   │   ├── main.py
│   │   └── seed.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── init.sql
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectMapPage.jsx
│   │   │   └── SiteDetailPage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .husky/
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

# 13. Local development

## Prerequisites

Install:

- Git
- Node.js 20+
- npm
- Python 3.11+
- PostgreSQL 16+
- PostGIS
- A Mapbox public access token

Docker Compose can also be used if preferred.

---

## 13. Clone the repository

```bash
git clone https://github.com/akritithap07/darukaa-site-intelligence.git
cd darukaa-site-intelligence
```

---

## Backend setup

```bash
cd backend
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### macOS/Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a PostgreSQL database with the PostGIS extension enabled.

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/darukaa
JWT_SECRET=replace-with-a-random-production-secret
CORS_ORIGINS=http://localhost:5173
```

Run the seed script:

```bash
python -m app.seed
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

---

# 14. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_PUBLIC_TOKEN
```

Start the application:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# 15. Demo account

The backend seed process creates the reviewer account automatically.

```text
Email:    demo@darukaa.earth
Password: demo1234
```

The seed also creates demonstration projects and geographical sites so a reviewer can enter the application and immediately inspect the map and site workflow.

> These credentials are intended for the demonstration environment only and must not be reused for production authentication.

---

# 16. Production build and validation

From `frontend/`:

```bash
npm run lint
npm run build
```

A successful Vite build produces the production assets under:

```text
frontend/dist/
```

Backend tests:

```bash
cd backend
pytest -q
```

The deterministic rule engine is designed to be independently testable and covers detection, no-data handling, climate deviation, stale evidence, synthetic evidence handling, and combined evaluation.

---

# 17. Environment variables

## Backend

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL/PostGIS connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `CORS_ORIGINS` | Comma-separated frontend origins |

## Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | FastAPI backend URL |
| `VITE_MAPBOX_TOKEN` | Public Mapbox access token |

Never commit real `.env` files, passwords, JWT secrets, database credentials, or private API keys.

---

# 18. CI/CD pipeline

The repository uses GitHub Actions to validate changes before they are considered deployable.

The workflow is defined in:

```text
.github/workflows/ci.yml
```

## Frontend CI

On pushes and pull requests to `main`, the frontend job:

```text
Checkout repository
      ↓
Set up Node.js
      ↓
Install dependencies
      ↓
Run ESLint
      ↓
Run Vite production build
```

Commands:

```bash
npm install
npm run lint
npm run build
```

## Backend CI

The backend job:

```text
Checkout repository
      ↓
Set up Python
      ↓
Start PostgreSQL + PostGIS service
      ↓
Install Python dependencies
      ↓
Run pytest
```

This is important because the backend tests run against a real PostGIS-enabled PostgreSQL service rather than only a mock database.

---

# 19. Pre-commit quality controls

The project also includes local developer quality checks.

The frontend uses:

- ESLint
- Prettier
- Husky
- lint-staged

The backend uses:

- Black
- Flake8
- pre-commit hooks

The intended developer workflow is:

```text
Edit
  ↓
git commit
  ↓
Pre-commit formatting/linting
  ↓
Commit
  ↓
Push to GitHub
  ↓
GitHub Actions
  ↓
Build + tests
```

This catches simple quality issues before they reach the deployment pipeline.

---

# 20. Deployment architecture

## Frontend — Vercel

Production frontend:

**https://darukaa-site-intelligence.vercel.app**

Vercel builds the React/Vite application from the `frontend` directory.

The SPA rewrite configuration is defined in:

```text
frontend/vercel.json
```

## Backend — Render

Production API:

**https://darukaa-backend-ritx.onrender.com**

The Render configuration is defined in:

```text
render.yaml
```

The backend uses a managed PostgreSQL database with PostGIS support.

The deployment startup process initializes the database schema, seeds the demo environment, and launches the FastAPI application.

---

# 21. Security model

The MVP includes:

- bcrypt password hashing
- JWT authentication
- protected backend routes
- project ownership checks
- environment-based secret configuration
- CORS configuration
- frontend Mapbox token supplied through environment variables

Intentionally out of scope for this MVP:

- refresh-token rotation
- rate limiting
- organization-level RBAC
- secrets rotation infrastructure
- advanced audit logging
- enterprise SSO

These are appropriate next steps for a production multi-organization platform.

---

# 22. Geospatial design decisions

Site polygons are stored in:

```text
PostGIS POLYGON
SRID 4326
```

The frontend uses GeoJSON to communicate site boundaries with the API and Mapbox.

A site also stores:

```text
centroid_lat
centroid_lon
area_hectares
```

The MVP area calculation is an approximate conversion suitable for demonstration-scale geometries. A production system would use a proper projected/equal-area calculation for authoritative area measurements.

PostGIS provides the correct foundation for future operations such as:

- spatial containment
- site intersection/overlap
- area calculations
- proximity queries
- spatial evidence retrieval

---

# 23. External-data reliability

External APIs can fail, become unavailable, or return incomplete data.

The application therefore distinguishes:

```text
successful evidence
vs
fetch failure
vs
synthetic/demo evidence
```

A failed external fetch is not silently displayed as valid environmental information.

Where external data is unavailable, the UI should communicate the absence of observations rather than converting missing data into a numerical zero.

This is especially important for biodiversity occurrence data, where:

```text
"No observations found"
```

is not equivalent to:

```text
"0 biodiversity"
```

---

# 24. Product and engineering trade-offs

## Why deterministic rules instead of an AI score?

The MVP does not have a sufficiently grounded training dataset or methodology for a scientifically defensible environmental-health score.

A deterministic rules layer is:

- transparent
- testable
- reproducible
- easier to audit
- easier to explain to domain specialists

## Why evidence snapshots?

Environmental information is time-dependent.

Retaining source-specific snapshots makes it possible to answer:

> What did we know, when did we know it, and where did it come from?

## Why adapters?

The evidence model is intentionally designed so different sources can normalize into the same downstream contract.

A future adapter could ingest:

```text
GBIF
NASA POWER
Satellite observations
Bioacoustics
Camera traps
Field surveys
Sensor data
```

without forcing the entire application to be rewritten.

---

# 25. Scalability roadmap

The current application is deliberately scoped as an MVP. The architecture supports several natural production extensions.

### Ingestion

Move external-data adapters behind asynchronous jobs with retry/backoff.

### Storage

Partition or archive evidence snapshots as data volume grows.

### Spatial workloads

Tune spatial indexes and introduce additional spatial aggregation for large portfolios.

### Organization model

Introduce organizations, teams, roles, and tenant isolation.

### Additional evidence

Add satellite, camera-trap, bioacoustic, sensor, and field-app adapters.

### Reporting

Introduce reporting/export workflows after domain requirements are defined with appropriate scientific and disclosure expertise.

---

# 26. What is intentionally not in the MVP

The following were deliberately excluded to keep the product focused:

- AI chatbot
- arbitrary biodiversity/environmental health score
- blockchain-based credit ledger
- full TNFD/BRSR report generator
- full satellite-processing pipeline
- notification infrastructure
- complex enterprise RBAC
- unnecessary microservices

The goal was to make the **core site-intelligence loop** work end-to-end rather than create a larger but less reliable feature set.

---

# 27. Reviewer demo path

Use the seeded account to walk through the application:

```text
1. Login
2. Open the Dashboard
3. Select a project
4. Open the Project Map
5. Inspect existing site polygons
6. Draw a new site polygon
7. Save the site
8. Open Site Detail
9. Review evidence
10. Inspect provenance and timestamps
11. Compare baseline and current
12. Review "What Changed"
13. Review "Needs Attention"
```

The intended narrative is:

> **Here is the site → here is the evidence → here is what changed → here is why the system surfaced it.**

---

# 28. Known MVP limitations

- External-source ingestion is intentionally lightweight and not yet backed by a production task queue.
- External API availability depends on the upstream services.
- Area calculation is approximate for prototype-scale geometry.
- Baseline/current periods are application-defined rather than tied to a registry-specific ecological baseline.
- Authentication is deliberately minimal and intended for the MVP rather than enterprise identity management.
- Reporting/export workflows are not implemented in this version.

---

# 29. Repository and live application

### GitHub

https://github.com/akritithap07/darukaa-site-intelligence

### Live application

https://darukaa-site-intelligence.vercel.app

### Backend API

https://darukaa-backend-ritx.onrender.com

### API documentation

https://darukaa-backend-ritx.onrender.com/docs

---

# 30. Project status

**MVP implementation**

The current implementation focuses on the complete journey from authenticated project management through geospatial site creation and evidence-backed site intelligence.

The system is intentionally structured so that additional environmental data sources and more advanced operational workflows can be introduced without changing the core site/evidence model.

---

## Built with

**React · Vite · Mapbox GL JS · Mapbox Draw · Chart.js · FastAPI · PostgreSQL · PostGIS · SQLAlchemy · GeoAlchemy2 · Shapely · JWT · GitHub Actions · Vercel · Render**
