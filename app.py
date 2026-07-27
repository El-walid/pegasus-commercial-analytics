import streamlit as st
import pandas as pd
import os
import bcrypt
import urllib.parse
import smtplib
import sqlite3
import tempfile
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from streamlit_option_menu import option_menu

# ========================================================
# 1. PAGE CONFIG & ENVIRONMENT SETUP
# ========================================================
st.set_page_config(page_title="Dashboard Commercial Pegasus", layout="wide", page_icon="📊")

load_dotenv()
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3307')
DB_NAME = os.getenv('DB_NAME', 'pegasus_db')

safe_password = urllib.parse.quote_plus(DB_PASS)
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
    st.stop()

# ========================================================
# 3. HELPER FUNCTIONS & ETL PIPELINE
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
    try:
        with engine.connect() as conn:
            # 1. DIMENSION CLIENTS
            new_clients = df[['Client']].drop_duplicates().rename(columns={'Client': 'nom_client'})
            existing_clients = pd.read_sql("SELECT nom_client FROM dim_clients", conn)
            missing_clients = new_clients[~new_clients['nom_client'].isin(existing_clients['nom_client'])]
            if not missing_clients.empty:
                missing_clients.to_sql('dim_clients', conn, if_exists='append', index=False)
            dim_clients = pd.read_sql("SELECT id_client, nom_client as Client FROM dim_clients", conn)

            # 2. DIMENSION COMMERCIAUX
            new_comms = df[['Commercial']].drop_duplicates().rename(columns={'Commercial': 'nom_commercial'})
            existing_comms = pd.read_sql("SELECT nom_commercial FROM dim_commerciaux", conn)
            missing_comms = new_comms[~new_comms['nom_commercial'].isin(existing_comms['nom_commercial'])]
            if not missing_comms.empty:
                missing_comms.to_sql('dim_commerciaux', conn, if_exists='append', index=False)
            dim_commerciaux = pd.read_sql("SELECT id_commercial, nom_commercial as Commercial FROM dim_commerciaux", conn)

            # 3. DIMENSION LOCALISATIONS
            new_locs = df[['Ville']].drop_duplicates()
            new_locs['region'] = new_locs['Ville'].apply(get_region)
            new_locs.rename(columns={'Ville': 'ville'}, inplace=True)
            existing_locs = pd.read_sql("SELECT ville FROM dim_localisations", conn)
            missing_locs = new_locs[~new_locs['ville'].isin(existing_locs['ville'])]
            if not missing_locs.empty:
                missing_locs.to_sql('dim_localisations', conn, if_exists='append', index=False)
            dim_locs = pd.read_sql("SELECT id_localisation, ville as Ville FROM dim_localisations", conn)

            # 4. DIMENSION PRODUITS
            new_prods = df[['Moteur', 'Alternateur', 'Puissance_kVA']].drop_duplicates()
            new_prods['categorie_puissance'] = new_prods['Puissance_kVA'].apply(get_puissance_cat)
            new_prods.rename(columns={'Moteur': 'moteur', 'Alternateur': 'alternateur', 'Puissance_kVA': 'puissance_kva'}, inplace=True)
            existing_prods = pd.read_sql("SELECT moteur, alternateur, puissance_kva FROM dim_produits", conn)
            
            merged_prods = new_prods.merge(existing_prods, on=['moteur', 'alternateur', 'puissance_kva'], how='left', indicator=True)
            missing_prods = merged_prods[merged_prods['_merge'] == 'left_only'].drop(columns=['_merge'])
            if not missing_prods.empty:
                missing_prods.to_sql('dim_produits', conn, if_exists='append', index=False)
            dim_prods = pd.read_sql("SELECT id_produit, moteur as Moteur, alternateur as Alternateur, puissance_kva as Puissance_kVA FROM dim_produits", conn)

            # 5. FACT VENTES (MERGE IDs)
            fact_df = df.merge(dim_clients, on='Client', how='left')
            fact_df = fact_df.merge(dim_commerciaux, on='Commercial', how='left')
            fact_df = fact_df.merge(dim_locs, on='Ville', how='left')
            fact_df = fact_df.merge(dim_prods, on=['Moteur', 'Alternateur', 'Puissance_kVA'], how='left')

            cols_to_keep = ['Date_Commande', 'id_client', 'id_commercial', 'id_localisation', 'id_produit', 
                            'Statut', 'Jours_Livraison', 'Quantite', 'Prix_Unitaire_MAD', 'Chiffre_Affaires_MAD', 'Cout_MAD']
            
            fact_final = fact_df[cols_to_keep].rename(columns=str.lower)
            fact_final.to_sql('fact_ventes', conn, if_exists='append', index=False)
            conn.commit()
            
        return len(fact_final)
    except Exception as e:
        st.error(f"Erreur lors de l'exportation: {e}")
        return 0

def generate_sqlite_db(dataframe):
    """Generates an SQLite database file in memory for download."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
        tmp_path = tmp.name
    
    conn = sqlite3.connect(tmp_path)
    dataframe.to_sql("ventes_nettoyees", conn, index=False, if_exists="replace")
    conn.close()
    
    with open(tmp_path, "rb") as f:
        db_bytes = f.read()
        
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
        
    return db_bytes

# ========================================================
# 4. MODULES DE PAGES (Routing Functions)
# ========================================================

def page_home():
    st.title("📊 Accueil & Hub d'Intégration (ETL)")
    
    st.write("Importez vos rapports de ventes Excel pour les nettoyer, les normaliser et les injecter dans la base de données principale.")
    
    uploaded_file = st.file_uploader("📂 Importer un fichier Excel", type=['xlsx', 'xls'])
    
    if uploaded_file is not None:
        try:
            df = pd.read_excel(uploaded_file, engine='openpyxl')
            if 'Date_Commande' in df.columns:
                df['Date_Commande'] = pd.to_datetime(df['Date_Commande'])
            
            st.success("Fichier importé avec succès !")
            st.divider()

            st.subheader("Vue d'Ensemble des Données Brutes")
            
            total_revenue = df['Chiffre_Affaires_MAD'].sum() if 'Chiffre_Affaires_MAD' in df.columns else 0
            total_sales = len(df)
            top_city = df['Ville'].value_counts().index[0] if 'Ville' in df.columns else "N/A"
            
            col1, col2, col3 = st.columns(3)
            col1.metric(label="Chiffre d'Affaires Total (MAD)", value=f"{total_revenue:,.2f}")
            col2.metric(label="Volume de Lignes", value=total_sales)
            col3.metric(label="Ville Principale", value=top_city)

            st.divider()

            st.subheader("🛠️ Outils de Traitement & Exportation")
            
            # Reset cleaned_df if a new file is uploaded
            if "last_uploaded_file" not in st.session_state or st.session_state.last_uploaded_file != uploaded_file.name:
                if "cleaned_df" in st.session_state:
                    del st.session_state["cleaned_df"]
                st.session_state.last_uploaded_file = uploaded_file.name

            col_clean, col_mysql, col_download = st.columns(3)
            
            with col_clean:
                st.write("**1. Nettoyage Intelligent**")
                if st.button("✨ Sanitiser les Données", use_container_width=True):
                    initial_rows = len(df)
                    cleaned = df.copy()
                    cleaned = cleaned.drop_duplicates()
                    
                    if 'Ville' in cleaned.columns:
                        cleaned['Ville'] = cleaned['Ville'].astype(str).str.strip().str.title()
                    if 'Client' in cleaned.columns:
                        cleaned['Client'] = cleaned['Client'].fillna("NON SPÉCIFIÉ").astype(str).str.strip().str.upper()
                    if 'Commercial' in cleaned.columns:
                        cleaned['Commercial'] = cleaned['Commercial'].astype(str).str.strip().str.title()
                    if 'Moteur' in cleaned.columns:
                        cleaned['Moteur'] = cleaned['Moteur'].astype(str).str.strip().str.title()
                    if 'Alternateur' in cleaned.columns:
                        cleaned['Alternateur'] = cleaned['Alternateur'].astype(str).str.strip().str.title()
                    if 'Statut' in cleaned.columns:
                        cleaned['Statut'] = cleaned['Statut'].astype(str).str.strip().str.title()

                    numeric_cols = ['Quantite', 'Prix_Unitaire_MAD', 'Chiffre_Affaires_MAD', 'Cout_MAD', 'Jours_Livraison']
                    for col in numeric_cols:
                        if col in cleaned.columns:
                            cleaned[col] = cleaned[col].fillna(0).abs()
                    if 'Quantite' in cleaned.columns:
                        cleaned['Quantite'] = cleaned['Quantite'].astype(int)
                    if 'Jours_Livraison' in cleaned.columns:
                        cleaned['Jours_Livraison'] = cleaned['Jours_Livraison'].astype(int)

                    for col in cleaned.columns:
                        if pd.api.types.is_object_dtype(cleaned[col]) or pd.api.types.is_string_dtype(cleaned[col]):
                            cleaned[col] = cleaned[col].fillna("Non Spécifié").astype(str).str.strip()
                            
                    final_rows = len(cleaned)
                    st.session_state.cleaned_df = cleaned
                    st.success(f"Nettoyé ! {initial_rows - final_rows} doublons supprimés.")

            with col_mysql:
                st.write("**2. Déploiement Serveur**")
                if st.button("🚀 Pousser vers MySQL", use_container_width=True):
                    if "cleaned_df" in st.session_state:
                        with st.spinner("Injection dans le Star Schema MySQL..."):
                            rows_inserted = export_to_star_schema(st.session_state.cleaned_df)
                            if rows_inserted > 0:
                                st.success(f"✅ {rows_inserted} lignes injectées !")
                    else:
                        st.warning("Veuillez d'abord exécuter le nettoyage.")

            with col_download:
                st.write("**3. Téléchargement Local**")
                if "cleaned_df" in st.session_state:
                    db_data = generate_sqlite_db(st.session_state.cleaned_df)
                    st.download_button(
                        label="📥 Télécharger en SQL (.db)",
                        data=db_data,
                        file_name="donnees_commerciales_pegasus.db",
                        mime="application/x-sqlite3",
                        use_container_width=True
                    )
                else:
                    st.info("Nettoyez d'abord pour activer l'export local.")

            st.divider()
            
            st.subheader("Aperçu des Données")
            if "cleaned_df" in st.session_state:
                st.caption("🟢 Affichage du jeu de données **nettoyé et formaté**.")
                preview_df = st.session_state.cleaned_df.copy()
            else:
                st.caption("🟡 Affichage du jeu de données **brut**.")
                preview_df = df.copy()
                
            for col in preview_df.columns:
                if pd.api.types.is_object_dtype(preview_df[col]) or pd.api.types.is_string_dtype(preview_df[col]):
                    preview_df[col] = preview_df[col].astype(str)
                    
            st.dataframe(preview_df)
            
        except Exception as e:
            st.error(f"Erreur lors de la lecture du fichier : {e}")
    else:
        st.info("En attente de fichier... Importez un fichier Excel pour activer les modules d'analyse.")

def page_ai_analytics():
    st.title("🤖 IA & Analytique Avancée")
    st.write("Ce module sera connecté à un LLM (ex: OpenAI/Gemini) pour analyser les tendances de ventes et générer des insights.")
    st.info("Interface de requête IA en cours de développement.")
    st.text_area(
        "Posez une question à l'IA sur vos données commerciales :", 
        "Ex: Quelle est la stratégie optimale d'inventaire pour ce trimestre ?"
    )
    st.button("Générer l'Analyse")

def page_communication():
    st.title("✉️ Centre de Communication")
    st.write("Envoyez des rapports, des directives ou des alertes directement aux collaborateurs.")
    
    with st.form("email_form"):
        destinataire = st.text_input("Destinataire (Email)", placeholder="commercial@pegasus.com")
        sujet = st.text_input("Sujet de l'email", placeholder="Mise à jour : Stratégie de Vente")
        message = st.text_area("Corps du message", height=150)
        fichier_joint = st.file_uploader("Joindre un fichier (Optionnel)", type=['pdf', 'xlsx', 'csv', 'pbix', 'db'])
        
        submit_email = st.form_submit_button("Envoyer l'Email 🚀")
        
        if submit_email:
            if not destinataire or not sujet or not message:
                st.error("Veuillez remplir tous les champs obligatoires (Destinataire, Sujet, Message).")
            else:
                try:
                    smtp_server = os.getenv('SMTP_SERVER')
                    smtp_port = int(os.getenv('SMTP_PORT', 587))
                    smtp_user = os.getenv('SMTP_USER')
                    smtp_pass = os.getenv('SMTP_PASS')
                    
                    if not smtp_server or not smtp_user:
                        st.error("Configuration SMTP manquante dans le fichier .env.")
                    else:
                        with st.spinner("Envoi de l'email en cours..."):
                            msg = MIMEMultipart()
                            msg['From'] = smtp_user
                            msg['To'] = destinataire
                            msg['Subject'] = sujet
                            msg.attach(MIMEText(message, 'plain'))
                            
                            if fichier_joint is not None:
                                part = MIMEApplication(fichier_joint.read(), Name=fichier_joint.name)
                                part['Content-Disposition'] = f'attachment; filename="{fichier_joint.name}"'
                                msg.attach(part)
                            
                            server = smtplib.SMTP(smtp_server, smtp_port)
                            server.starttls()
                            server.login(smtp_user, smtp_pass)
                            server.send_message(msg)
                            server.quit()
                            
                            st.success(f"Email envoyé avec succès à {destinataire} !")
                except Exception as e:
                    st.error(f"Erreur technique lors de l'envoi : {e}")

def page_settings():
    st.title("⚙️ Paramètres Système")
    st.write("Gestion des configurations de l'application.")
    
    st.subheader("Informations de session")
    st.text(f"Utilisateur connecté : {st.session_state.username}")
    st.text(f"Base de données active : {DB_NAME}")
    st.text(f"Hôte de base de données : {DB_HOST}")
    
    st.subheader("Statut des Services")
    st.success("✅ Base de données MySQL (Connectée)")
    if os.getenv('SMTP_SERVER'):
        st.success("✅ Serveur SMTP (Configuré)")
    else:
        st.warning("⚠️ Serveur SMTP (Non configuré - Ajoutez les clés dans .env)")

# ========================================================
# 5. SIDEBAR NAVIGATION CONTROLLER (UPGRADED UI)
# ========================================================
with st.sidebar:
    st.markdown(f"### 👤 Admin : {st.session_state.username}")
    st.divider()

    choix_page = option_menu(
        menu_title=None,
        options=["Accueil & ETL", "IA Analytique", "Communication", "Paramètres"],
        icons=["cloud-upload", "robot", "envelope", "gear"], 
        menu_icon="cast", 
        default_index=0,
        styles={
            "container": {"padding": "0!important", "background-color": "transparent"},
            "icon": {"color": "#4C83FF", "font-size": "18px"}, 
            "nav-link": {
                "font-size": "15px", 
                "text-align": "left", 
                "margin": "0px", 
                "border-radius": "8px",
                "--hover-color": "#333333" if st.get_option("theme.base") == "dark" else "#f0f2f6"
            },
            "nav-link-selected": {"background-color": "#4C83FF", "color": "white"},
        }
    )

    st.divider()
    if st.button("Se Déconnecter", use_container_width=True):
        st.session_state.authenticated = False
        st.rerun()

if choix_page == "Accueil & ETL":
    page_home()
elif choix_page == "IA Analytique":
    page_ai_analytics()
elif choix_page == "Communication":
    page_communication()
elif choix_page == "Paramètres":
    page_settings()