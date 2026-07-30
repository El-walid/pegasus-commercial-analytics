import pandas as pd
from sqlalchemy import create_engine, text
import os
import urllib.parse
from dotenv import load_dotenv

# ==========================================
# 1. CONFIGURATION & CONNEXION BDD
# ==========================================

# Safely locate the .env file in the parent directory

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path) 

DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'Elwalid1010@@')
# Fallback to your WSL bridge IP if .env is not found
DB_HOST = os.getenv('DB_HOST', '172.22.160.1') 
DB_PORT = os.getenv('DB_PORT', '3307')
DB_NAME = os.getenv('DB_NAME', 'pegasus_db')

# Encode the password to handle the '@@' characters safely
safe_password = urllib.parse.quote_plus(DB_PASS)
engine = create_engine(f"mysql+pymysql://{DB_USER}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# ==========================================
# 2. LECTURE & NETTOYAGE DU FICHIER ERP
# ==========================================
FILE_PATH = os.path.join("..", "excel_files", "Liste des factures de ventes.xlsx") 

print(f"📥 Lecture du fichier : {FILE_PATH}...")
df = pd.read_excel(FILE_PATH, engine='openpyxl')

# Clean Date format (DD.MM.YYYY -> YYYY-MM-DD)
df['Date d\'enregistrement'] = pd.to_datetime(df['Date d\'enregistrement'], format='%d.%m.%Y').dt.date

# Remove any completely empty rows
df = df.dropna(how='all')

print(f"✅ Fichier chargé : {len(df)} lignes trouvées.")

# ==========================================
# 3. EXTRACTION DES DIMENSIONS (Référentiels)
# ==========================================
print("⚙️ Traitement des Dimensions...")

# --- A. DIM CLIENTS ---
# Since there is no Client Code, we generate one (CLI-0001, CLI-0002)
dim_clients = df[['Client']].drop_duplicates().dropna().reset_index(drop=True)
dim_clients['code_client'] = ['CLI-' + str(i).zfill(4) for i in range(1, len(dim_clients) + 1)]
dim_clients = dim_clients.rename(columns={'Client': 'nom_client'})

# --- B. DIM ARTICLES ---
dim_articles = df[['ItemCode', 'Dscription', 'Prix']].drop_duplicates(subset=['ItemCode']).dropna(subset=['ItemCode'])
dim_articles = dim_articles.rename(columns={
    'ItemCode': 'code_article', 
    'Dscription': 'designation', 
    'Prix': 'prix_unitaire_ref'
})

# --- C. DIM COMMERCIAUX ---
dim_commerciaux = df[['SlpName', 'Division']].drop_duplicates(subset=['SlpName']).dropna(subset=['SlpName'])
dim_commerciaux = dim_commerciaux.rename(columns={'SlpName': 'nom_commercial', 'Division': 'division'})
dim_commerciaux['objectif_annuel'] = 5000000.00 # Default fallback target


# ==========================================
# 3.5 NETTOYAGE AUTOMATIQUE DE LA BDD (TRUNCATE)
# ==========================================
print("🧹 Nettoyage de la base de données...")
with engine.begin() as conn:
    conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
    conn.execute(text("TRUNCATE TABLE fact_factures_lignes;"))
    conn.execute(text("TRUNCATE TABLE fact_factures_entetes;"))
    conn.execute(text("TRUNCATE TABLE dim_commerciaux;"))
    conn.execute(text("TRUNCATE TABLE dim_articles;"))
    conn.execute(text("TRUNCATE TABLE dim_clients;"))
    conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
print("✨ Base de données réinitialisée.")


# ==========================================
# 4. INJECTION DES DIMENSIONS EN BASE
# ==========================================
with engine.connect() as conn:
    # We use if_exists='append' to add to the tables we created via SQL
    dim_clients.to_sql('dim_clients', conn, if_exists='append', index=False)
    dim_articles.to_sql('dim_articles', conn, if_exists='append', index=False)
    dim_commerciaux.to_sql('dim_commerciaux', conn, if_exists='append', index=False)
    conn.commit()
# ==========================================
# 5. PRÉPARATION DES TABLES DE FAITS (Transactions)
# ==========================================
print("⚙️ Traitement des Factures et Lignes...")

# Need to map the generated Client IDs and Commercial IDs back to the main dataframe
client_mapping = dict(zip(dim_clients['nom_client'], dim_clients['code_client']))
df['code_client'] = df['Client'].map(client_mapping)

# Fetch the auto-incremented Commercial IDs from MySQL
commerciaux_db = pd.read_sql("SELECT id_commercial, nom_commercial FROM dim_commerciaux", engine)
comm_mapping = dict(zip(commerciaux_db['nom_commercial'], commerciaux_db['id_commercial']))
df['id_commercial'] = df['SlpName'].map(comm_mapping)

# --- A. FACT FACTURES ENTETES (DB 2) ---
# FIX: Use .agg() to guarantee exactly ONE header per invoice number, even if ERP data is messy
entetes = df.groupby('Numéro de document', as_index=False).agg({
    'Date d\'enregistrement': 'first',
    'code_client': 'first',
    'id_commercial': 'first',
    'Total Ligne HT': 'sum'
})

entetes = entetes.rename(columns={
    'Numéro de document': 'numero_fac',
    'Date d\'enregistrement': 'date_facture',
    'Total Ligne HT': 'total_ht'
})

# --- B. FACT FACTURES LIGNES (DB 1) ---
lignes = df[['Numéro de document', 'ItemCode', 'Quantity', 'Prix', 'Total Ligne HT', 'Devise document']]
lignes = lignes.rename(columns={
    'Numéro de document': 'numero_fac',
    'ItemCode': 'code_article',
    'Quantity': 'qte',
    'Prix': 'prix_unitaire',
    'Total Ligne HT': 'total_ht_ligne',
    'Devise document': 'devise'
})

# ==========================================
# 6. INJECTION DES TRANSACTIONS EN BASE
# ==========================================
with engine.connect() as conn:
    entetes.to_sql('fact_factures_entetes', conn, if_exists='append', index=False)
    lignes.to_sql('fact_factures_lignes', conn, if_exists='append', index=False)
    conn.commit()

print(f"✅ Succès ! Les {len(df)} lignes ont été normalisées et injectées dans la base MySQL.")