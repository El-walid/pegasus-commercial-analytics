
USE pegasus_db;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE dim_clients (
    code_client VARCHAR(50) PRIMARY KEY,
    nom_client VARCHAR(255) NOT NULL
);

CREATE TABLE dim_articles (
    code_article VARCHAR(50) PRIMARY KEY,
    designation VARCHAR(255) NOT NULL,
    prix_unitaire_ref DECIMAL(15, 2) NOT NULL
);

CREATE TABLE dim_commerciaux (
    id_commercial INT AUTO_INCREMENT PRIMARY KEY,
    nom_commercial VARCHAR(255) NOT NULL UNIQUE,
    division VARCHAR(50) NOT NULL, -- ex: DElectr, DHydro
    objectif_annuel DECIMAL(15, 2) NOT NULL
);

-- Correspond à la DB 2 (Entêtes / Facture Globale)
CREATE TABLE fact_factures_entetes (
    numero_fac VARCHAR(100) PRIMARY KEY,
    date_facture DATE NOT NULL,
    code_client VARCHAR(50) NOT NULL,
    id_commercial INT NOT NULL,
    total_ht DECIMAL(15, 2) NOT NULL,
    
    FOREIGN KEY (code_client) REFERENCES dim_clients(code_client) ON DELETE RESTRICT,
    FOREIGN KEY (id_commercial) REFERENCES dim_commerciaux(id_commercial) ON DELETE RESTRICT
);

-- Correspond à la DB 1 (Lignes détaillées)
CREATE TABLE fact_factures_lignes (
    id_ligne INT AUTO_INCREMENT PRIMARY KEY,
    numero_fac VARCHAR(100) NOT NULL,
    code_article VARCHAR(50) NOT NULL,
    qte INT NOT NULL,
    prix_unitaire DECIMAL(15, 2) NOT NULL,
    total_ht_ligne DECIMAL(15, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'MAD',
    
    FOREIGN KEY (numero_fac) REFERENCES fact_factures_entetes(numero_fac) ON DELETE CASCADE,
    FOREIGN KEY (code_article) REFERENCES dim_articles(code_article) ON DELETE RESTRICT
);


-- Créer la nouvelle vue unifiée pour le futur Backend / Highcharts
CREATE VIEW v_factures_globales AS
SELECT 
    e.numero_fac,
    e.date_facture,
    c.code_client,
    c.nom_client,
    com.nom_commercial,
    com.division,
    a.code_article,
    a.designation,
    l.qte,
    l.prix_unitaire,
    l.total_ht_ligne,
    l.devise
FROM fact_factures_lignes l
JOIN fact_factures_entetes e ON l.numero_fac = e.numero_fac
JOIN dim_clients c ON e.code_client = c.code_client
JOIN dim_commerciaux com ON e.id_commercial = com.id_commercial
JOIN dim_articles a ON l.code_article = a.code_article;