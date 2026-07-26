import streamlit as st
import pandas as pd
import os
import bcrypt
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

st.set_page_config(page_title="Dashboard Commercial Pegasus", layout="wide", page_icon="📊")

load_dotenv()
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3307')
DB_NAME = os.getenv('DB_NAME', 'pegasus_db')

# Safely encode the password to handle special characters like '@'
safe_password = urllib.parse.quote_plus(DB_PASS)

# Create SQLAlchemy Engine using the encoded password
engine = create_engine(f"mysql+pymysql://{DB_USER}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# ========================================================
# 2. SECURITY & AUTHENTICATION
# ========================================================
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "username" not in st.session_state:
    st.session_state.username = None

def verify_login(username, password):
    try:
        with engine.connect() as conn:
            query = text("SELECT password_hash, role FROM utilisateurs WHERE username = :u AND actif = TRUE")
            result = conn.execute(query, {"u": username}).fetchone()
            
            if result:
                stored_hash = result[0].encode('utf-8')
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
                    return True
    except Exception as e:
        st.error(f"Erreur de connexion à la base de données: {e}")
    return False

if not st.session_state.authenticated:
    st.title("🔒 Portail d'Administration Pegasus")
    st.write("Veuillez vous connecter pour accéder au tableau de bord.")
    
    with st.form("login_form"):
        username_input = st.text_input("Nom d'utilisateur")
        password_input = st.text_input("Mot de passe", type="password")
        submit_button = st.form_submit_button("Se Connecter")
        
        if submit_button:
            if verify_login(username_input, password_input):
                st.session_state.authenticated = True
                st.session_state.username = username_input
                st.rerun()
            else:
                st.error("Identifiants incorrects ou compte désactivé.")
    st.stop() # Halts execution here if not authenticated

# ========================================================
# 3. HELPER FUNCTIONS FOR ETL (Data Engineering)
# ========================================================
def get_region(ville):
    regions = {
        'Marrakech': 'Marrakech-Safi', 'Safi': 'Marrakech-Safi', 'Essaouira': 'Marrakech-Safi',
        'Casablanca': 'Casablanca-Settat', 'Settat': 'Casablanca-Settat',
        'Tanger': 'Tanger-Tetouan-Al Hoceima', 'Agadir': 'Souss-Massa',
        'Rabat': 'Rabat-Salé-Kénitra', 'Fès': 'Fès-Meknès', 'Oujda': 'L\'Oriental',
        'Béni Mellal': 'Béni Mellal-Khénifra'
    }
    return regions.get(ville, 'Autre')

def get_puissance_cat(kva):
    if kva <= 50: return 'Petite Puissance'
    elif kva <= 250: return 'Moyenne Puissance'
    elif kva <= 1000: return 'Haute Puissance'
    else: return 'Très Haute Puissance'

def export_to_star_schema(df):
    """ETL Pipeline: Maps flat data into the MySQL Star Schema"""
    try:
        with engine.connect() as conn:
            # --- 1. DIMENSION CLIENTS ---
            new_clients = df[['Client']].drop_duplicates().rename(columns={'Client': 'nom_client'})
            existing_clients = pd.read_sql("SELECT nom_client FROM dim_clients", conn)
            missing_clients = new_clients[~new_clients['nom_client'].isin(existing_clients['nom_client'])]
            if not missing_clients.empty:
                missing_clients.to_sql('dim_clients', conn, if_exists='append', index=False)
            dim_clients = pd.read_sql("SELECT id_client, nom_client as Client FROM dim_clients", conn)

            # --- 2. DIMENSION COMMERCIAUX ---
            new_comms = df[['Commercial']].drop_duplicates().rename(columns={'Commercial': 'nom_commercial'})
            existing_comms = pd.read_sql("SELECT nom_commercial FROM dim_commerciaux", conn)
            missing_comms = new_comms[~new_comms['nom_commercial'].isin(existing_comms['nom_commercial'])]
            if not missing_comms.empty:
                missing_comms.to_sql('dim_commerciaux', conn, if_exists='append', index=False)
            dim_commerciaux = pd.read_sql("SELECT id_commercial, nom_commercial as Commercial FROM dim_commerciaux", conn)

            # --- 3. DIMENSION LOCALISATIONS ---
            new_locs = df[['Ville']].drop_duplicates()
            new_locs['region'] = new_locs['Ville'].apply(get_region)
            new_locs.rename(columns={'Ville': 'ville'}, inplace=True)
            existing_locs = pd.read_sql("SELECT ville FROM dim_localisations", conn)
            missing_locs = new_locs[~new_locs['ville'].isin(existing_locs['ville'])]
            if not missing_locs.empty:
                missing_locs.to_sql('dim_localisations', conn, if_exists='append', index=False)
            dim_locs = pd.read_sql("SELECT id_localisation, ville as Ville FROM dim_localisations", conn)

            # --- 4. DIMENSION PRODUITS ---
            new_prods = df[['Moteur', 'Alternateur', 'Puissance_kVA']].drop_duplicates()
            new_prods['categorie_puissance'] = new_prods['Puissance_kVA'].apply(get_puissance_cat)
            new_prods.rename(columns={'Moteur': 'moteur', 'Alternateur': 'alternateur', 'Puissance_kVA': 'puissance_kva'}, inplace=True)
            existing_prods = pd.read_sql("SELECT moteur, alternateur, puissance_kva FROM dim_produits", conn)
            # Create a composite key for merging to find missing ones safely
            merged_prods = new_prods.merge(existing_prods, on=['moteur', 'alternateur', 'puissance_kva'], how='left', indicator=True)
            missing_prods = merged_prods[merged_prods['_merge'] == 'left_only'].drop(columns=['_merge'])
            if not missing_prods.empty:
                missing_prods.to_sql('dim_produits', conn, if_exists='append', index=False)
            dim_prods = pd.read_sql("SELECT id_produit, moteur as Moteur, alternateur as Alternateur, puissance_kva as Puissance_kVA FROM dim_produits", conn)

            # --- 5. FACT VENTES (MERGE IDs) ---
            # Map dimensions to the main dataframe
            fact_df = df.merge(dim_clients, on='Client', how='left')
            fact_df = fact_df.merge(dim_commerciaux, on='Commercial', how='left')
            fact_df = fact_df.merge(dim_locs, on='Ville', how='left')
            fact_df = fact_df.merge(dim_prods, on=['Moteur', 'Alternateur', 'Puissance_kVA'], how='left')

            # Select and rename columns to match the fact_ventes schema
            cols_to_keep = ['Date_Commande', 'id_client', 'id_commercial', 'id_localisation', 'id_produit', 
                            'Statut', 'Jours_Livraison', 'Quantite', 'Prix_Unitaire_MAD', 'Chiffre_Affaires_MAD', 'Cout_MAD']
            
            fact_final = fact_df[cols_to_keep].rename(columns=str.lower)
            
            # Insert into MySQL
            fact_final.to_sql('fact_ventes', conn, if_exists='append', index=False)
            
            conn.commit()
            
        return True
    except Exception as e:
        st.error(f"Erreur lors de l'exportation: {e}")
        return False

# ========================================================
# 4. DASHBOARD UI (Protected Area)
# ========================================================
st.sidebar.title(f"👤 Bienvenue, {st.session_state.username}")
if st.sidebar.button("Se Déconnecter"):
    st.session_state.authenticated = False
    st.rerun()

st.title("📊 Analyse des Performances Commerciales")

@st.cache_data
def load_data(file_path):
    df = pd.read_excel(file_path, engine='openpyxl')
    df['Date_Commande'] = pd.to_datetime(df['Date_Commande'])
    return df

data_path = os.path.join('excel_files', 'mock_commercial_data.xlsx')

try:
    df = load_data(data_path)
    
    st.subheader("Vue d'Ensemble des Fichiers Raw (Excel)")
    total_revenue = df['Chiffre_Affaires_MAD'].sum()
    total_sales = len(df)
    top_city = df['Ville'].value_counts().index[0] if 'Ville' in df.columns else "N/A"
    
    col1, col2, col3 = st.columns(3)
    col1.metric(label="Chiffre d'Affaires Total (MAD)", value=f"{total_revenue:,.2f}")
    col2.metric(label="Volume de Ventes", value=total_sales)
    col3.metric(label="Ville la Plus Performante", value=top_city)

    st.divider()

    st.subheader("🛠️ Outils ETL : Intégration MySQL (Star Schema)")
    col_clean, col_export = st.columns(2)
    
    with col_clean:
        st.write("**Étape 1: Nettoyage Automatique**")
        if st.button("Sanitiser les données"):
            initial_rows = len(df)
            df = df.drop_duplicates()
            for col in df.columns:
                if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
                    df[col] = df[col].fillna("Non Spécifié").astype(str).str.strip()
                else:
                    df[col] = df[col].fillna(0)
                    
            final_rows = len(df)
            st.success(f"Nettoyage terminé ! {initial_rows - final_rows} doublons supprimés.")
            st.session_state.cleaned_df = df

    with col_export:
        st.write("**Étape 2: Injection Base de Données**")
        if st.button("🚀 Pousser vers MySQL"):
            if "cleaned_df" in st.session_state:
                with st.spinner("Modélisation et injection dans les tables Dimensionnelles et Faits..."):
                    if export_to_star_schema(st.session_state.cleaned_df):
                        st.success("✅ Données injectées avec succès dans le Star Schema MySQL !")
            else:
                st.warning("Veuillez d'abord nettoyer les données (Étape 1).")

    st.divider()
    st.subheader("Aperçu des Données (Avant Injection)")
    preview_df = df.copy()
    
    # Updated: Safe string conversion without triggering the Pandas 4 warning
    for col in preview_df.columns:
         if pd.api.types.is_object_dtype(preview_df[col]) or pd.api.types.is_string_dtype(preview_df[col]):
            preview_df[col] = preview_df[col].astype(str)
            
    st.dataframe(preview_df)

except FileNotFoundError:
    st.error("⚠️ Fichier Excel introuvable. Avez-vous généré le mock data ?")