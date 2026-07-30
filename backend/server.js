const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Route par défaut
app.get('/', (req, res) => {
    res.json({ message: "Bienvenue sur l'API SEHI Pegasus ! Les données sont sur /api/performances-commerciaux" });
});

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '172.22.160.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Elwalid1010@@',
    database: process.env.DB_NAME || 'pegasus_db',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Endpoint: Authentication (Login)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check if the user exists in the database
        // NOTE: Adjust 'utilisateurs' and column names if they differ in your database
        const [rows] = await pool.execute('SELECT * FROM utilisateurs WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        const user = rows[0];

        // 2. Compare the typed password with your bcrypt hash
        const match = await bcrypt.compare(password, user.password_hash); // adjust 'user.password' to your DB column name

        if (!match) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        // 3. Generate a secure token valid for 8 hours
        const jwtSecret = process.env.JWT_SECRET || 'clef_secrete_provisoire_pegasus';
        const token = jwt.sign(
            { id: user.id_user, username: user.username }, 
            jwtSecret, 
            { expiresIn: '8h' }
        );

        // 4. Send token back to the React frontend
        res.json({ token, username: user.username });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Erreur Serveur Interne' });
    }
});

// Endpoint: Performances Commerciaux
app.get('/api/performances-commerciaux', async (req, res) => {
    try {
        // Calculate current day of the year (1-365)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const currentDayOfYear = Math.floor(diff / oneDay);

        const query = `
            SELECT 
                c.nom_commercial,
                c.division,
                c.objectif_annuel,
                COALESCE(SUM(f.total_ht), 0) as ca_realise,
                (c.objectif_annuel / 365) * ? as objectif_attendu_a_ce_jour
            FROM dim_commerciaux c
            LEFT JOIN fact_factures_entetes f ON c.id_commercial = f.id_commercial
            GROUP BY c.id_commercial
            ORDER BY ca_realise DESC;
        `;

        const [rows] = await pool.execute(query, [currentDayOfYear]);
        
        // Map Red/Green/Neutral status
        const formattedData = rows.map(row => {
            const caRealise = parseFloat(row.ca_realise);
            const objectifAttendu = parseFloat(row.objectif_attendu_a_ce_jour);
            const objectifAnnuel = parseFloat(row.objectif_annuel);
            let status = "NEUTRAL";

            if (caRealise > objectifAttendu) status = "GREEN";
            else if (caRealise < (objectifAttendu * 0.9)) status = "RED"; // 10% tolerance margin

            return {
                ...row,
                ca_realise: caRealise,
                objectif_attendu_a_ce_jour: objectifAttendu,
                objectif_annuel: objectifAnnuel,
                status: status
            };
        });

        res.json(formattedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint: KPI Dashboard (Global Metrics)
// Endpoint: KPI Dashboard (Global Metrics + Filtrage par Division)
app.get('/api/kpis', async (req, res) => {
    try {
        // 1. Récupération du paramètre depuis React
        const division = req.query.division;
        const whereClause = division ? 'WHERE c.division = ?' : '';
        const params = division ? [division] : [];

        // 2. Exécution des requêtes avec jointure sur dim_commerciaux pour filtrer
        const [totalCaRow] = await pool.execute(`
            SELECT SUM(f.total_ht) as total 
            FROM fact_factures_entetes f
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
        `, params);
        const totalCa = parseFloat(totalCaRow[0].total) || 0;

        const [actifsRow] = await pool.execute(`
            SELECT COUNT(DISTINCT f.id_commercial) as actifs 
            FROM fact_factures_entetes f
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
        `, params);
        const commerciauxActifs = actifsRow[0].actifs;

        const [objectifRow] = await pool.execute(`
            SELECT SUM(c.objectif_annuel) as total_obj 
            FROM dim_commerciaux c
            ${whereClause}
        `, params);
        const totalObj = parseFloat(objectifRow[0].total_obj) || 1;
        const objectifAtteint = ((totalCa / totalObj) * 100).toFixed(1);

        const [topVendeurRow] = await pool.execute(`
            SELECT c.nom_commercial, SUM(f.total_ht) as ca 
            FROM fact_factures_entetes f 
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial 
            ${whereClause}
            GROUP BY c.id_commercial 
            ORDER BY ca DESC LIMIT 1
        `, params);
        const topVendeur = topVendeurRow.length > 0 ? topVendeurRow[0].nom_commercial : 'N/A';

        const [topClientRow] = await pool.execute(`
            SELECT cl.nom_client, SUM(f.total_ht) as ca 
            FROM fact_factures_entetes f 
            JOIN dim_clients cl ON f.code_client = cl.code_client 
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
            GROUP BY cl.code_client 
            ORDER BY ca DESC LIMIT 1
        `, params);
        const topClient = topClientRow.length > 0 ? topClientRow[0].nom_client : 'N/A';

        const [topArticleRow] = await pool.execute(`
            SELECT a.designation, SUM(l.total_ht_ligne) as ca 
            FROM fact_factures_lignes l 
            JOIN fact_factures_entetes f ON l.numero_fac = f.numero_fac
            JOIN dim_articles a ON l.code_article = a.code_article 
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
            GROUP BY a.code_article 
            ORDER BY ca DESC LIMIT 1
        `, params);
        const topArticle = topArticleRow.length > 0 ? topArticleRow[0].designation : 'N/A';

        const [facturesRow] = await pool.execute(`
            SELECT COUNT(f.numero_fac) as nb 
            FROM fact_factures_entetes f
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
        `, params);
        const nbFactures = facturesRow[0].nb;

        const [ticketRow] = await pool.execute(`
            SELECT AVG(f.total_ht) as ticket 
            FROM fact_factures_entetes f
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
        `, params);
        const ticketMoyen = parseFloat(ticketRow[0].ticket) || 0;

        res.json({
            total_ca: (totalCa / 1000000).toFixed(2) + 'M',
            commerciaux_actifs: commerciauxActifs,
            objectif_atteint: objectifAtteint + '%',
            top_vendeur: topVendeur.replace('Commercial ', 'C'),
            top_client: topClient.length > 15 ? topClient.substring(0, 15) + '...' : topClient,
            top_article: topArticle.length > 15 ? topArticle.substring(0, 15) + '...' : topArticle,
            nb_factures: nbFactures,
            ticket_moyen: (ticketMoyen / 1000).toFixed(1) + 'K'
        });

    } catch (error) {
        console.error("Erreur KPIs:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint: Top Clients (Avec filtrage dynamique par Division)
app.get('/api/top-clients', async (req, res) => {
    try {
        const division = req.query.division;
        const whereClause = division ? 'WHERE c.division = ?' : '';
        const params = division ? [division] : [];

        // Récupère le Top 5 des clients (basé sur le CA généré)
        const [rows] = await pool.execute(`
            SELECT 
                cl.code_client, 
                cl.nom_client, 
                COUNT(DISTINCT f.numero_fac) as nb_commandes, 
                SUM(f.total_ht) as ca_total
            FROM fact_factures_entetes f
            JOIN dim_clients cl ON f.code_client = cl.code_client
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial
            ${whereClause}
            GROUP BY cl.code_client, cl.nom_client
            ORDER BY ca_total DESC
            LIMIT 30
        `, params);

        res.json(rows);
    } catch (error) {
        console.error("Erreur Top Clients:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint: Répartition du CA par Division
app.get('/api/repartition-division', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT c.division, SUM(f.total_ht) as ca 
            FROM fact_factures_entetes f 
            JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial 
            GROUP BY c.division
            ORDER BY ca DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error("Erreur Pie Chart:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend en cours d'exécution sur le port ${PORT}`);
});