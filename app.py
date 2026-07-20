import streamlit as st
import pandas as pd
import os
import sqlite3

# 1. Page Configuration
st.set_page_config(page_title="Dashboard Commercial Pegasus", layout="wide", page_icon="📊")

st.title("📊 Analyse des Performances Commerciales")

# 2. Data Ingestion & Caching
# The @st.cache_data decorator ensures the app doesn't reload the Excel file every time you click a button
@st.cache_data
def load_data(file_path):
    df = pd.read_excel(file_path, engine='openpyxl')
    
    # 1. Convert the date column
    df['Date_Commande'] = pd.to_datetime(df['Date_Commande'])
    
    # 2. Force all 'object' (text) columns to strictly be strings to prevent PyArrow crashes
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str)
        
    return df

# 3. Load the Mock Data
data_path = os.path.join('excel_files', 'mock_commercial_data.xlsx')

try:
    df = load_data(data_path)
    
    # 4. Top-Level KPIs (Key Performance Indicators)
    st.subheader("Vue d'Ensemble")
    
    total_revenue = df['Chiffre_Affaires_MAD'].sum()
    total_sales = len(df)
    top_city = df['City'].value_counts().index[0]
    
    # Create 3 columns for metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(label="Chiffre d'Affaires Total (MAD)", value=f"{total_revenue:,.2f}")
    with col2:
        st.metric(label="Volume de Ventes", value=total_sales)
    with col3:
        st.metric(label="Ville la Plus Performante", value=top_city)

    st.divider()

    st.subheader("🛠️ Outils de Traitement des Données")
    
    col_clean, col_export = st.columns(2)
    
    with col_clean:
        st.write("**Nettoyage Automatique**")
        if st.button("Nettoyer les doublons et valeurs manquantes"):
            # 1. Remove duplicates
            initial_rows = len(df)
            df = df.drop_duplicates()
            
            # 2. Fill empty values based on data type
            for col in df.columns:
                if df[col].dtype == 'object': # Text columns (like Client name)
                    df[col] = df[col].fillna("Non Spécifié")
                else: # Numeric columns (like Quantite or Prix)
                    df[col] = df[col].fillna(0)
            
            final_rows = len(df)
            st.success(f"Nettoyage terminé ! {initial_rows - final_rows} doublons supprimés. Cellules vides remplies.")

    with col_export:
        st.write("**Exportation Base de Données**")
        
        # Function to generate the SQLite DB in bytes only when requested
        def generate_sqlite_db(dataframe):
            import tempfile
            # Create a temporary file path
            with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
                tmp_path = tmp.name
            
            # Export dataframe to SQLite database at that path
            conn = sqlite3.connect(tmp_path)
            dataframe.to_sql("ventes_commerciales", conn, index=False, if_exists="replace")
            conn.close()
            
            # Read bytes
            with open(tmp_path, "rb") as f:
                db_bytes = f.read()
                
            # Clean up the temp file on disk
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
            return db_bytes

        # The data= argument receives the result of the function call when clicked
        st.download_button(
            label="📥 Télécharger en format SQL (.db)",
            data=generate_sqlite_db(df),
            file_name="base_donnees_pegasus.db",
            mime="application/x-sqlite3"
        )

    st.divider()
    
    # 5. Data Preview (Keep this at the bottom)
    st.subheader("Aperçu des Données")
    st.dataframe(df)

except FileNotFoundError:
    st.error("⚠️ Fichier introuvable. Avez-vous généré le mock data ?")