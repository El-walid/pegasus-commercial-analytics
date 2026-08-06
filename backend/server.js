const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Ollama } = require('ollama');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Ollama (pointing to WSL host gateway from inside Docker)
const ollama = new Ollama({ host: 'http://host.docker.internal:11434' });

// Route par défaut
app.get('/', (req, res) => {
    res.json({ message: "Bienvenue sur l'API SEHI Pegasus ! Les données sont sur /api/performances-commerciaux" });
});

// Database Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST || '172.22.160.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Elwalid1010@@',
    database: process.env.DB_NAME || 'pegasus_db',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; 
        next();
    });
};

// ==========================================
// AUTHENTICATION & SETTINGS ROUTES
// ==========================================

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
    }

    const query = 'SELECT * FROM utilisateurs WHERE username = ? AND actif = 1';
    
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error("❌ SQL Error during login:", err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }

        const user = results[0];

        try {
            const passwordMatch = await bcrypt.compare(password, user.password_hash);

            if (passwordMatch) {
                if (!process.env.JWT_SECRET) {
                    console.error("❌ FATAL: process.env.JWT_SECRET is undefined.");
                    return res.status(500).json({ error: 'Server configuration error' });
                }

                const token = jwt.sign(
                    { id: user.id_user, username: user.username, role: user.role }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '24h' }
                );
                
                res.json({ token, role: user.role });
            } else {
                res.status(401).json({ message: 'Identifiants incorrects' });
            }
        } catch (executionError) {
            console.error("❌ JavaScript Execution Error in /api/login:", executionError);
            res.status(500).json({ error: 'Internal server error during authentication' });
        }
    });
});

app.get('/api/user-settings', authenticateToken, (req, res) => {
    if (!req.user || !req.user.username) {
        return res.status(400).json({ error: "Token invalide : username manquant." });
    }

    const query = `SELECT email, prenom, nom, role, ai_model, sync_interval, language, notifications FROM utilisateurs WHERE username = ?`;
    
    db.query(query, [req.user.username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Utilisateur non trouvé dans la DB" });
        
        const user = results[0];
        user.notifications = user.notifications === 1; 
        res.json(user);
    });
});

app.put('/api/user-settings', authenticateToken, (req, res) => {
    const { email, prenom, nom, aiModel, syncInterval, language, notifications } = req.body;
    
    const query = `
        UPDATE utilisateurs 
        SET email = ?, prenom = ?, nom = ?, ai_model = ?, sync_interval = ?, language = ?, notifications = ? 
        WHERE username = ?
    `;
    
    const notifValue = notifications ? 1 : 0; 

    db.query(query, [email, prenom, nom, aiModel, syncInterval, language, notifValue, req.user.username], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Paramètres mis à jour avec succès" });
    });
});

// ==========================================
// DASHBOARD & ANALYTICS ROUTES
// ==========================================

app.get('/api/performances-commerciaux', (req, res) => {
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

    db.query(query, [currentDayOfYear], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        
        const formattedData = rows.map(row => {
            const caRealise = parseFloat(row.ca_realise);
            const objectifAttendu = parseFloat(row.objectif_attendu_a_ce_jour);
            const objectifAnnuel = parseFloat(row.objectif_annuel);
            let status = "NEUTRAL";

            if (caRealise > objectifAttendu) status = "GREEN";
            else if (caRealise < (objectifAttendu * 0.9)) status = "RED";

            return {
                ...row,
                ca_realise: caRealise,
                objectif_attendu_a_ce_jour: objectifAttendu,
                objectif_annuel: objectifAnnuel,
                status: status
            };
        });

        res.json(formattedData);
    });
});

app.get('/api/kpis', (req, res) => {
    const division = req.query.division;
    const whereClause = division ? 'WHERE c.division = ?' : '';
    const params = division ? [division] : [];

    db.query(`SELECT SUM(f.total_ht) as total FROM fact_factures_entetes f JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause}`, params, (err, totalCaRow) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        const totalCa = parseFloat(totalCaRow[0].total) || 0;

        db.query(`SELECT COUNT(DISTINCT f.id_commercial) as actifs FROM fact_factures_entetes f JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause}`, params, (err, actifsRow) => {
            const commerciauxActifs = actifsRow[0].actifs;

            db.query(`SELECT SUM(c.objectif_annuel) as total_obj FROM dim_commerciaux c ${whereClause}`, params, (err, objectifRow) => {
                const totalObj = parseFloat(objectifRow[0].total_obj) || 1;
                const objectifAtteint = ((totalCa / totalObj) * 100).toFixed(1);

                db.query(`SELECT c.nom_commercial, SUM(f.total_ht) as ca FROM fact_factures_entetes f JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause} GROUP BY c.id_commercial ORDER BY ca DESC LIMIT 1`, params, (err, topVendeurRow) => {
                    const topVendeur = topVendeurRow.length > 0 ? topVendeurRow[0].nom_commercial : 'N/A';

                    db.query(`SELECT cl.nom_client, SUM(f.total_ht) as ca FROM fact_factures_entetes f JOIN dim_clients cl ON f.code_client = cl.code_client JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause} GROUP BY cl.code_client ORDER BY ca DESC LIMIT 1`, params, (err, topClientRow) => {
                        const topClient = topClientRow.length > 0 ? topClientRow[0].nom_client : 'N/A';

                        db.query(`SELECT a.designation, SUM(l.total_ht_ligne) as ca FROM fact_factures_lignes l JOIN fact_factures_entetes f ON l.numero_fac = f.numero_fac JOIN dim_articles a ON l.code_article = a.code_article JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause} GROUP BY a.code_article ORDER BY ca DESC LIMIT 1`, params, (err, topArticleRow) => {
                            const topArticle = topArticleRow.length > 0 ? topArticleRow[0].designation : 'N/A';

                            db.query(`SELECT COUNT(f.numero_fac) as nb FROM fact_factures_entetes f JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause}`, params, (err, facturesRow) => {
                                const nbFactures = facturesRow[0].nb;

                                db.query(`SELECT AVG(f.total_ht) as ticket FROM fact_factures_entetes f JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial ${whereClause}`, params, (err, ticketRow) => {
                                    const ticketMoyen = parseFloat(ticketRow[0].ticket) || 0;

                                    res.json({
                                        total_ca: (totalCa / 1000000).toFixed(2) + 'M',
                                        commerciaux_actifs: commerciauxActifs,
                                        objectif_atteint: objectifAtteint + '%',
                                        top_vendeur: topVendeur.replace('Commercial ', 'C'),
                                        top_client: topClient,
                                        top_article: topArticle,
                                        nb_factures: nbFactures,
                                        ticket_moyen: (ticketMoyen / 1000).toFixed(1) + 'K'
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/top-clients', (req, res) => {
    const { division, commercial } = req.query;
    let query = `
        SELECT c.code_client, c.nom_client, COUNT(DISTINCT f.numero_fac) as nb_commandes, SUM(f.total_ht) as ca_total
        FROM dim_clients c
        JOIN fact_factures_entetes f ON c.code_client = f.code_client
        JOIN dim_commerciaux com ON f.id_commercial = com.id_commercial
        WHERE 1=1
    `;
    const queryParams = [];

    if (division) {
        query += ` AND com.division = ?`;
        queryParams.push(division);
    }
    if (commercial) {
        query += ` AND com.nom_commercial = ?`;
        queryParams.push(commercial);
    }

    query += ` GROUP BY c.code_client, c.nom_client ORDER BY ca_total DESC LIMIT 10`;

    db.query(query, queryParams, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/ca-yoy', (req, res) => {
    const query = `
        SELECT 
            MONTH(date_facture) as mois,
            SUM(CASE WHEN YEAR(date_facture) = YEAR(CURDATE()) THEN total_ht ELSE 0 END) as ca_current,
            SUM(CASE WHEN YEAR(date_facture) = YEAR(CURDATE()) - 1 THEN total_ht ELSE 0 END) as ca_previous
        FROM fact_factures_entetes
        WHERE YEAR(date_facture) IN (YEAR(CURDATE()), YEAR(CURDATE()) - 1)
        GROUP BY mois
        ORDER BY mois ASC
    `;
    db.query(query, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/repartition-division', (req, res) => {
    db.query(`
        SELECT c.division, SUM(f.total_ht) as ca 
        FROM fact_factures_entetes f 
        JOIN dim_commerciaux c ON f.id_commercial = c.id_commercial 
        GROUP BY c.division
        ORDER BY ca DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/bubble-commerciaux', (req, res) => {
    const query = `
        SELECT 
            com.nom_commercial,
            COUNT(DISTINCT f.numero_fac) as nb_factures,
            SUM(f.total_ht) as ca_realise,
            (SUM(f.total_ht) / COUNT(DISTINCT f.numero_fac)) as ticket_moyen
        FROM dim_commerciaux com
        JOIN fact_factures_entetes f ON com.id_commercial = f.id_commercial
        GROUP BY com.id_commercial, com.nom_commercial
        HAVING nb_factures > 0
    `;
    db.query(query, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/sankey-flow', (req, res) => {
    const query1 = `
        SELECT com.division AS source, com.nom_commercial AS target, SUM(f.total_ht) AS weight
        FROM dim_commerciaux com
        JOIN fact_factures_entetes f ON com.id_commercial = f.id_commercial
        GROUP BY com.division, com.nom_commercial
        HAVING weight > 0
    `;
    
    const query2 = `
        SELECT com.nom_commercial AS source, c.nom_client AS target, SUM(f.total_ht) AS weight
        FROM dim_commerciaux com
        JOIN fact_factures_entetes f ON com.id_commercial = f.id_commercial
        JOIN dim_clients c ON f.code_client = c.code_client
        GROUP BY com.nom_commercial, c.nom_client
        ORDER BY weight DESC
        LIMIT 30
    `;

    db.query(query1, (err, rows1) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        db.query(query2, (err, rows2) => {
            if (err) return res.status(500).json({ error: 'Internal Server Error' });

            const commercialTotals = {};
            rows1.forEach(row => {
                const comName = row.target || 'Inconnu';
                commercialTotals[comName] = (commercialTotals[comName] || 0) + Number(row.weight);
            });

            const commercialOutgoing = {};
            rows2.forEach(row => {
                const comName = row.source || 'Inconnu';
                commercialOutgoing[comName] = (commercialOutgoing[comName] || 0) + Number(row.weight);
            });

            const autresClientsFlows = [];
            for (const [comName, totalIn] of Object.entries(commercialTotals)) {
                const totalOut = commercialOutgoing[comName] || 0;
                const difference = totalIn - totalOut;

                if (difference > 1) { 
                    autresClientsFlows.push({
                        source: comName,
                        target: 'Autres Clients',
                        weight: difference
                    });
                }
            }

            const combinedData = [...rows1, ...rows2, ...autresClientsFlows].map(row => [
                row.source || 'Inconnu',
                row.target || 'Inconnu',
                Number(row.weight)
            ]);

            res.json(combinedData);
        });
    });
});

// ==========================================
// DATA HUB ROUTES
// ==========================================

app.get('/api/system-status', (req, res) => {
    db.query('SELECT COUNT(*) as total FROM fact_factures_entetes', (err, records) => {
        if (err) return res.status(500).json({ error: 'Database Connection Failed' });
        db.query('SELECT MAX(date_facture) as last_date FROM fact_factures_entetes', (err, lastSync) => {
            res.json({
                status: "Online",
                total_invoices: records[0].total,
                last_sync: lastSync[0].last_date || "N/A",
                anomalies: 0 
            });
        });
    });
});

app.post('/api/sync-clients', (req, res) => {
    const { data } = req.body;
    if (!data || data.length === 0) {
        return res.status(400).json({ error: "No data received." });
    }

    const values = data.map(row => {
        const code = row['Numéro de document'] || row['Code Client'] || row['code_client'] || row[Object.keys(row)[0]];
        const name = row['Client'] || row['Raison Sociale'] || row['nom_client'] || row[Object.keys(row)[2]];
        return [ String(code), String(name) ]; 
    });

    db.query('INSERT IGNORE INTO dim_clients (code_client, nom_client) VALUES ?', [values], (err, result) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error during synchronization.' });
        res.json({ success: true, total_processed: data.length, inserted: result.affectedRows });
    });
});

app.get('/api/commerciaux', (req, res) => {
    db.query('SELECT id_commercial, nom_commercial, division, objectif_annuel FROM dim_commerciaux ORDER BY nom_commercial ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/clients', (req, res) => {
    db.query('SELECT code_client, nom_client FROM dim_clients ORDER BY nom_client ASC LIMIT 200', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.get('/api/articles', (req, res) => {
    db.query('SELECT code_article, designation, prix_unitaire_ref FROM dim_articles ORDER BY designation ASC LIMIT 200', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json(rows);
    });
});

app.put('/api/commerciaux/:id', (req, res) => {
    const { id } = req.params;
    const { nom_commercial, division, objectif_annuel } = req.body;
    db.query('UPDATE dim_commerciaux SET nom_commercial = ?, division = ?, objectif_annuel = ? WHERE id_commercial = ?', [nom_commercial, division, objectif_annuel, id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update Commercial' });
        res.json({ success: true, message: 'Commercial updated successfully' });
    });
});

app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { nom_client } = req.body;
    db.query('UPDATE dim_clients SET nom_client = ? WHERE code_client = ?', [nom_client, id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update Client' });
        res.json({ success: true, message: 'Client updated successfully' });
    });
});

app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { designation, prix_unitaire_ref } = req.body;
    db.query('UPDATE dim_articles SET designation = ?, prix_unitaire_ref = ? WHERE code_article = ?', [designation, prix_unitaire_ref, id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update Article' });
        res.json({ success: true, message: 'Article updated successfully' });
    });
});


// ==========================================
// AI ASSISTANT ROUTE (INTELLIGENCE RESTORED + CRASH PROTECTION)
// ==========================================
app.post('/api/ai-query', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) return res.status(400).json({ error: "Prompt is required." });

        const dbSchema = `
        Schéma de la base de données Pegasus :
        - dim_commerciaux (id_commercial, nom_commercial, division, objectif_annuel)
        - dim_clients (code_client, nom_client)
        - dim_articles (code_article, designation, prix_unitaire_ref)
        - fact_factures_entetes (numero_fac, date_facture, id_commercial, code_client, total_ht)
        - fact_factures_lignes (id_ligne, numero_fac, code_article, qte, prix_unitaire, total_ht_ligne, devise)
        - v_factures_globales (numero_fac, date_facture, code_client, nom_client, nom_commercial, division, code_article, designation, qte, prix_unitaire, total_ht_ligne, devise)

        Règles SQL Strictes & Anti-Crash (TRÈS IMPORTANT) :
        1. UTILISATION DE LA VUE : Dès qu'une question implique un nom de produit (designation), un client (nom_client) ou un commercial (nom_commercial), utilise UNIQUEMENT la vue 'v_factures_globales'.
        2. INTERDICTION DE JOIN SUR LA VUE : La vue 'v_factures_globales' contient DÉJÀ toutes les informations. Ne fais JAMAIS de JOIN si tu l'utilises.
        3. COLONNES DE LA VUE : Dans 'v_factures_globales', le chiffre d'affaires s'appelle 'total_ht_ligne' (pas 'total_ht').
        4. RÈGLE D'AGRÉGATION : Pour trouver un "meilleur", utilise un alias. Exemple EXACT et PARFAIT : SELECT nom_commercial, SUM(total_ht_ligne) AS total_ventes FROM v_factures_globales GROUP BY nom_commercial ORDER BY total_ventes DESC LIMIT 1.
        5. FILTRES TEMPORELS : Utilise les fonctions natives (Ex: MONTH(date_facture) = 1 pour Janvier).
        6. RECHERCHE DE TEXTE : Si la question cherche un nom spécifique (client ou article), utilise LIKE '%mot%' en SQL pour éviter les erreurs de casse ou de frappe.
        `;

        // ÉTAPE 1 : Routeur d'intention & Génération SQL
        const sqlGenerationResponse = await ollama.chat({
            model: 'llama3.1',
            messages: [
                { 
                    role: 'system', 
                    content: `Tu es le routeur central de SEHI Pegasus.
                    RÈGLE 1 : Si l'utilisateur dit juste "bonjour", "hi", "merci", ou pose une question qui n'a AUCUN rapport avec la base de données, tu DOIS répondre EXACTEMENT par un seul mot : CHITCHAT
                    RÈGLE 2 : Si la question concerne les données, tu es un ingénieur SQL. Génère UNIQUEMENT la requête SQL brute commençant par SELECT. Aucun markdown, aucun texte explicatif.
                    
                    ${dbSchema}` 
                },
                { role: 'user', content: prompt }
            ],
            options: { temperature: 0 } 
        });

        let generatedSQL = sqlGenerationResponse.message.content.trim().replace(/```sql/g, '').replace(/```/g, '').trim();

        console.log("🤖 Action de l'IA :", generatedSQL);

        // 🟢 BIFURCATION : GESTION DES SALUTATIONS (CHIT-CHAT)
        if (generatedSQL.toUpperCase() === 'CHITCHAT') {
            const chatResponse = await ollama.chat({
                model: 'llama3.1',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Tu es l\'assistant IA amical et professionnel de SEHI Pegasus. Réponds poliment et de façon concise. Réponds toujours dans la même langue que l\'utilisateur.' 
                    },
                    { role: 'user', content: prompt }
                ],
                options: { temperature: 0.7 }
            });
            return res.json({ answer: chatResponse.message.content });
        }

        // 🔴 SÉCURITÉ SQL (Seulement si ce n'est pas du Chit-Chat)
        if (!generatedSQL.toUpperCase().startsWith('SELECT')) {
            return res.status(400).json({ answer: "Requête non autorisée. Je ne peux exécuter que des lectures (SELECT) ou répondre à des questions simples." });
        }

        // ÉTAPE 2 : Exécution de la requête avec wrapper Promise de sécurité
        let dbResults;
        try {
            dbResults = await new Promise((resolve, reject) => {
                db.query(generatedSQL, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
        } catch (dbError) {
            console.error("❌ SQL généré invalide :", generatedSQL);
            console.error("❌ Erreur MySQL :", dbError.message);
            return res.json({ 
                answer: `Désolé, j'ai généré une requête SQL invalide en tentant de croiser ces données.\n\n**Requête :** ${generatedSQL}\n**Erreur interne :** ${dbError.message}` 
            });
        }

        // ÉTAPE 3 : Le "Smart Analyst" (Insights & Prédictions)
        const finalAnalysisResponse = await ollama.chat({
            model: 'llama3.1',
            messages: [
                { 
                    role: 'system', 
                    content: `Tu es un Senior Data Analyst chez SEHI Pegasus.
                    On te fournit une question et les résultats de la base de données.
                    RÈGLE 1 : Réponds dans la langue de l'utilisateur.
                    RÈGLE 2 : Tu DOIS structurer ta réponse exactement avec ces 4 parties (utilise des emojis et du gras) :
                    
                    **📊 Constat :** (La réponse directe et factuelle à la question)
                    **💡 Analyse :** (Ce que ce chiffre signifie pour le business)
                    **🚀 Recommandation :** (Une action stratégique à prendre)
                    **🔮 Prédiction :** (Une projection logique basée sur ce contexte)
                    
                    RÈGLE 3 (CRITIQUE) : Formate TOUS les montants financiers avec la devise "MAD" (Dirham). N'utilise JAMAIS, sous AUCUN prétexte, le symbole Euro (€) ou Dollar ($). Les montants doivent être formatés proprement (ex: 15 420.50 MAD).
                    
                    Sois professionnel, percutant et visionnaire. Ne parle jamais de la requête SQL.` 
                },
                { 
                    role: 'user', 
                    content: `Question : "${prompt}"\n\nDonnées extraites : ${JSON.stringify(dbResults)}` 
                }
            ],
            options: { temperature: 0.7 } 
        });

        res.json({ answer: finalAnalysisResponse.message.content });

    } catch (error) {
        console.error("Erreur globale:", error);
        res.status(500).json({ answer: "Erreur critique du serveur IA. Vérifiez les logs Node.js." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend en cours d'exécution sur le port ${PORT}`);
});