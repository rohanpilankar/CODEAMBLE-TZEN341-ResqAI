from backend.database.session import Base, engine, SessionLocal
from backend.models import (
    Role, User, Incident, IncidentImage, DisasterType,
    Shelter, ShelterCapacity, MedicalFacility,
    Resource, RescueTeam, Vehicle, Equipment, Volunteer, Assignment,
    Notification, SystemLog, AuditLog,
    EmergencyContact, RouteHistory, Settings
)
from backend.models.public import NewsArticle
from backend.auth.jwt import hash_password
from backend.utils.logger import app_logger

def init_db():
    """Create all tables and seed demo data."""
    try:
        Base.metadata.create_all(bind=engine)
        app_logger.info("Database tables created.")
    except Exception as e:
        app_logger.error(f"Failed to create database tables: {e}", exc_info=True)
        raise
    seed_data()

def seed_data():
    db = SessionLocal()
    try:
        if db.query(Role).count() > 0:
            app_logger.info("Seed data already exists, skipping.")
            return

        # ─── Roles ────────────────────────────────────────────────────────
        roles = [
            Role(name="Citizen",              description="Regular citizen reporting emergencies"),
            Role(name="Volunteer",             description="Community volunteer assisting in relief operations"),
            Role(name="Rescue Team",          description="Field rescue and response personnel"),
            Role(name="Government Authority", description="District/state government officials"),
            Role(name="NGO",                  description="Non-governmental organization partner"),
            Role(name="Admin",                description="System administrator with full access"),
        ]
        for r in roles:
            db.add(r)
        db.commit()

        role_map = {r.name: r for r in db.query(Role).all()}

        # ─── Demo Users ───────────────────────────────────────────────────
        users = [
            User(email="admin@resqai.com",     full_name="Admin User",       hashed_password=hash_password("password123"), role_id=role_map["Admin"].id,                 phone_number="+91-9000000001"),
            User(email="gov@resqai.com",       full_name="District Officer",  hashed_password=hash_password("password123"), role_id=role_map["Government Authority"].id,   phone_number="+91-9000000002"),
            User(email="rescue@resqai.com",    full_name="Rescue Team Alpha", hashed_password=hash_password("password123"), role_id=role_map["Rescue Team"].id,            phone_number="+91-9000000003"),
            User(email="citizen@resqai.com",   full_name="Ravi Kumar",        hashed_password=hash_password("password123"), role_id=role_map["Citizen"].id,                phone_number="+91-9000000004"),
            User(email="volunteer@resqai.com", full_name="Priya Sharma",      hashed_password=hash_password("password123"), role_id=role_map["Volunteer"].id,              phone_number="+91-9000000005"),
            User(email="ngo@resqai.com",       full_name="Relief NGO",        hashed_password=hash_password("password123"), role_id=role_map["NGO"].id,                    phone_number="+91-9000000006"),
        ]
        for u in users:
            db.add(u)
        db.commit()

        # ─── Rescue Teams ─────────────────────────────────────────────────
        teams = [
            RescueTeam(name="Alpha Rescue Unit",  leader_name="Commander Singh", contact_phone="+91-9100000001", specialization="Flood Rescue",     current_latitude=19.0760, current_longitude=72.8777),
            RescueTeam(name="Beta Fire Response", leader_name="Captain Sharma",  contact_phone="+91-9100000002", specialization="Fire Suppression", current_latitude=19.0896, current_longitude=72.8656),
            RescueTeam(name="Gamma Medical Team", leader_name="Dr. Patel",       contact_phone="+91-9100000003", specialization="Emergency Medical", current_latitude=18.9220, current_longitude=72.8347),
        ]
        for t in teams:
            db.add(t)
        db.commit()

        # ─── Shelters ─────────────────────────────────────────────────────
        shelters = [
            Shelter(name="City Relief Center",    address="Dharavi Community Hall, Mumbai",    latitude=19.0450, longitude=72.8545, total_capacity=500, current_occupancy=120, medical_available=True,  food_available=True,  water_available=True,  contact_phone="+91-22-2501-0001"),
            Shelter(name="Northern Relief Camp",  address="Malad Sports Ground, Mumbai",       latitude=19.1870, longitude=72.8490, total_capacity=300, current_occupancy=75,  medical_available=True,  food_available=True,  water_available=True,  contact_phone="+91-22-2502-0001"),
            Shelter(name="Eastern Emergency Hub", address="Kurla Municipal School, Mumbai",    latitude=19.0725, longitude=72.8808, total_capacity=200, current_occupancy=195, medical_available=False, food_available=True,  water_available=True,  contact_phone="+91-22-2503-0001"),
            Shelter(name="Harbor District Shelter",address="Colaba Civic Centre, Mumbai",     latitude=18.9218, longitude=72.8347, total_capacity=150, current_occupancy=40,  medical_available=True,  food_available=False, water_available=True,  contact_phone="+91-22-2504-0001"),
        ]
        for s in shelters:
            db.add(s)
        db.commit()

        # ─── Resources ────────────────────────────────────────────────────
        rescue_team = db.query(RescueTeam).first()
        resources = [
            Resource(name="Ambulance Unit-1",   resource_type="AMBULANCE",   quantity=1, status="AVAILABLE", location_name="Central Depot",  latitude=19.0760, longitude=72.8777, team_id=rescue_team.id),
            Resource(name="Ambulance Unit-2",   resource_type="AMBULANCE",   quantity=1, status="ASSIGNED",  location_name="Eastern Zone",   latitude=19.0725, longitude=72.8808),
            Resource(name="Fire Truck Alpha",   resource_type="FIRE_TRUCK",  quantity=1, status="AVAILABLE", location_name="North Station",  latitude=19.1870, longitude=72.8490),
            Resource(name="Rescue Boat-1",      resource_type="RESCUE_BOAT", quantity=1, status="AVAILABLE", location_name="Harbor Depot",   latitude=18.9218, longitude=72.8347),
            Resource(name="Medical Kit Bundle", resource_type="MEDICAL_KIT", quantity=50,status="AVAILABLE", location_name="Central Depot"),
            Resource(name="Food Supply Pack",   resource_type="FOOD_SUPPLY", quantity=200,status="AVAILABLE",location_name="Relief Warehouse"),
            Resource(name="Water Cans Lot",     resource_type="WATER_SUPPLY",quantity=100,status="AVAILABLE",location_name="Relief Warehouse"),
            Resource(name="Volunteer Group A",  resource_type="VOLUNTEER",   quantity=20, status="AVAILABLE",location_name="City Square"),
        ]
        for r in resources:
            db.add(r)
        db.commit()

        # ─── Sample Incidents ─────────────────────────────────────────────
        citizen = db.query(User).filter(User.email == "citizen@resqai.com").first()
        team = db.query(RescueTeam).first()
        incidents = [
            Incident(title="Severe Flash Flooding – Dharavi",        description="Entire Dharavi area severely flooded. Roads blocked, residents stranded on rooftops.",       disaster_type="Flood",      severity="CRITICAL", status="IN_PROGRESS", latitude=19.0450, longitude=72.8545, reported_by_id=citizen.id, assigned_team_id=team.id, is_ai_verified=1, ai_confidence_score=0.94, address="Dharavi, Mumbai"),
            Incident(title="Structural Collapse – BKC Building",     description="6-storey residential building partially collapsed. Multiple people reported trapped.",        disaster_type="Earthquake", severity="CRITICAL", status="REPORTED",     latitude=19.0663, longitude=72.8647, reported_by_id=citizen.id, is_ai_verified=1, ai_confidence_score=0.91, address="BKC, Mumbai"),
            Incident(title="Warehouse Fire – Kurla Industrial Zone", description="Large warehouse on fire with toxic smoke. Fire spreading to adjacent building.",              disaster_type="Fire",       severity="HIGH",     status="VERIFIED",     latitude=19.0725, longitude=72.8808, reported_by_id=citizen.id, is_ai_verified=1, ai_confidence_score=0.88, address="Kurla, Mumbai"),
            Incident(title="Gas Leak – Colaba Apartment",            description="Strong gas smell reported from basement. Residents evacuated. Fire dept called.",             disaster_type="Gas Leak",   severity="HIGH",     status="IN_PROGRESS", latitude=18.9218, longitude=72.8347, reported_by_id=citizen.id, is_ai_verified=1, ai_confidence_score=0.85, address="Colaba, Mumbai"),
            Incident(title="Power Outage – Malad Suburb",            description="Complete power outage affecting 3 townships. Backup generators needed for hospitals.",        disaster_type="Power Outage",severity="MEDIUM",  status="REPORTED",     latitude=19.1870, longitude=72.8490, reported_by_id=citizen.id, is_ai_verified=1, ai_confidence_score=0.78, address="Malad, Mumbai"),
        ]
        for i in incidents:
            db.add(i)
        db.commit()

        # ─── Emergency Contacts ───────────────────────────────────────────
        contacts = [
            EmergencyContact(agency_name="Mumbai Police",          category="Police",          phone_number="100",          location="Mumbai City"),
            EmergencyContact(agency_name="Fire Brigade Mumbai",    category="Fire",            phone_number="101",          location="Mumbai City"),
            EmergencyContact(agency_name="Ambulance Services",     category="Ambulance",       phone_number="108",          location="Mumbai City"),
            EmergencyContact(agency_name="NDRF Mumbai Unit",       category="Disaster Mgmt",   phone_number="011-24363260", location="Mumbai"),
            EmergencyContact(agency_name="MCGM Disaster Cell",     category="Disaster Mgmt",   phone_number="1916",         location="Mumbai"),
        ]
        for c in contacts:
            db.add(c)

        # ─── Settings ─────────────────────────────────────────────────────
        settings_data = [
            Settings(key="map_default_lat",  value="19.0760",   description="Default map center latitude"),
            Settings(key="map_default_lng",  value="72.8777",   description="Default map center longitude"),
            Settings(key="map_default_zoom", value="11",         description="Default map zoom level"),
            Settings(key="app_name",         value="ResQAI",     description="Application display name"),
        ]
        for s in settings_data:
            db.add(s)

        # ─── News Articles ────────────────────────────────────────────────
        try:
            articles = [
                NewsArticle(title="ResQAI v2.0 Released: Blockchain Donations are Live!", content="We are thrilled to announce that our new smart-contract based donation system is now live on mainnet. Citizens can donate directly to verified NGOs with full on-chain transparency.", author="System Admin", is_published=1),
                NewsArticle(title="AI Duplicate Detection Accuracy Reaches 98%", content="Our NLP models have been updated to better process multi-lingual text and voice inputs. In the latest drill, the system successfully merged 1,400 duplicate reports down to 43 unique events in under 2 seconds.", author="ResQAI AI Lab", is_published=1),
                NewsArticle(title="Monsoon Preparedness & Relief Center Guidance", content="State authorities and emergency units have set up 15 high-capacity relief hubs equipped with medical kits, clean water, and satellite communications.", author="Disaster Management Authority", is_published=1),
            ]
            for a in articles:
                db.add(a)
        except Exception as e:
            app_logger.warning(f"Could not seed news articles: {e}")

        db.commit()
        app_logger.info("Demo seed data inserted successfully.")

    except Exception as e:
        db.rollback()
        app_logger.error(f"Seed data error: {e}", exc_info=True)
    finally:
        db.close()
