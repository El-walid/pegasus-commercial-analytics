from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import os
import urllib.parse
from dotenv import load_dotenv
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
app = FastAPI(title="SEHI Pegasus API")

# Allow frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path) 

DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'Elwalid1010@@')
DB_HOST = os.getenv('DB_HOST', '172.22.160.1') 
DB_PORT = os.getenv('DB_PORT', '3307')
DB_NAME = os.getenv('DB_NAME', 'pegasus_db')

safe_password = urllib.parse.quote_plus(DB_PASS)
engine = create_engine(f"mysql+pymysql://{DB_USER}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# ==========================================
# 2. ENDPOINTS (L'API)
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Pegasus API is running!"}

@app.get("/api/performances-commerciaux")
def get_performances_commerciaux():
    """
    Répond à la demande de l'IT Lead : 
    - Total HT par commercial
    - CA vs Objectif (Calcul au prorata)
    """
    # Calculate what day of the year today is (e.g., July 28 = Day 209)
    current_day_of_year = datetime.now().timetuple().tm_yday
    
    query = f"""
    SELECT 
        c.nom_commercial,
        c.division,
        c.objectif_annuel,
        COALESCE(SUM(f.total_ht), 0) as ca_realise,
        (c.objectif_annuel / 365) * {current_day_of_year} as objectif_attendu_a_ce_jour
    FROM dim_commerciaux c
    LEFT JOIN fact_factures_entetes f ON c.id_commercial = f.id_commercial
    GROUP BY c.id_commercial
    ORDER BY ca_realise DESC;
    """
    
    with engine.connect() as conn:
        result = conn.execute(text(query)).mappings().all()
        
    # Format the data cleanly for the frontend
    formatted_data = []
    for row in result:
        ca_realise = float(row['ca_realise'])
        objectif_attendu = float(row['objectif_attendu_a_ce_jour'])
        
        # Logic for Highcharts Red/Green/Neutral indicators
        if ca_realise > objectif_attendu:
            status = "GREEN (Surperformance)"
        elif ca_realise < (objectif_attendu * 0.9): # 10% tolerance
            status = "RED (Sous-performance)"
        else:
            status = "NEUTRAL (Dans les temps)"
            
        formatted_data.append({
            "commercial": row['nom_commercial'],
            "division": row['division'],
            "ca_realise": ca_realise,
            "objectif_annuel": float(row['objectif_annuel']),
            "objectif_attendu_aujourdhui": objectif_attendu,
            "statut": status
        })
        
    return formatted_data