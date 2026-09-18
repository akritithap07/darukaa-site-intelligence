"""
Seeds the database with a demo user, 2-3 projects, and sites with real
polygons so a reviewer has an immediate experience.

Run with: python -m app.seed
"""
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon

from app.core.db import Base, SessionLocal, engine, ensure_postgis
from app.core.security import hash_password
from app.models.models import Project, Site, User

DEMO_EMAIL = "demo@darukaa.earth"
DEMO_PASSWORD = "demo1234"


def make_square(center_lat, center_lon, half_side_deg=0.01):
    return Polygon(
        [
            (center_lon - half_side_deg, center_lat - half_side_deg),
            (center_lon + half_side_deg, center_lat - half_side_deg),
            (center_lon + half_side_deg, center_lat + half_side_deg),
            (center_lon - half_side_deg, center_lat + half_side_deg),
            (center_lon - half_side_deg, center_lat - half_side_deg),
        ]
    )


def run():
    ensure_postgis()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if not user:
            user = User(email=DEMO_EMAIL, hashed_password=hash_password(DEMO_PASSWORD))
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

        if db.query(Project).filter(Project.owner_id == user.id).count() > 0:
            print("Demo data already present, skipping.")
            return

        projects_data = [
            {
                "name": "Western Ghats Restoration Pilot",
                "description": "Nature-positive restoration monitoring pilot, Western Ghats corridor.",
                "sites": [
                    ("Site A — Riparian Buffer", 15.3173, 75.7139),
                ],
            },
            {
                "name": "Sundarbans Mangrove Baseline",
                "description": "Mangrove baseline monitoring for dMRV pre-feasibility.",
                "sites": [
                    ("Site B — Mangrove Block North", 21.9497, 88.9468),
                ],
            },
            {
                "name": "Nilgiri Biosphere Corridor",
                "description": "Habitat connectivity site monitoring.",
                "sites": [
                    ("Site C — Corridor Segment 3", 11.4064, 76.6932),
                ],
            },
        ]

        for pdata in projects_data:
            project = Project(name=pdata["name"], description=pdata["description"], owner_id=user.id)
            db.add(project)
            db.commit()
            db.refresh(project)

            for site_name, lat, lon in pdata["sites"]:
                poly = make_square(lat, lon)
                site = Site(
                    project_id=project.id,
                    name=site_name,
                    geom=from_shape(poly, srid=4326),
                    centroid_lat=lat,
                    centroid_lon=lon,
                    area_hectares=round(poly.area * 111320 * 111320 / 10000, 2),
                )
                db.add(site)
            db.commit()

        print("Seed complete: 3 projects, 3 sites created.")
    finally:
        db.close()


if __name__ == "__main__":
    run()