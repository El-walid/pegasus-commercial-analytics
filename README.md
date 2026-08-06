# 🚀 SEHI Pegasus — Autonomous AI Data Analyst & Analytics Suite

**SEHI Pegasus** is a full-stack, enterprise-grade data analytics platform and AI assistant designed for business intelligence, database management, and natural language Text-to-SQL analysis. Powered by a local **Llama 3.1** model, React, Express, MySQL, and Docker, Pegasus delivers real-time business insights, interactive visual dashboards, and seamless Excel-to-SQL data ingestion.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Highcharts, React Markdown, `html2pdf.js`
* **Backend:** Node.js, Express, Axios, Multer, XLSX, JWT Authentication
* **AI / LLM:** Ollama running **Llama 3.1** locally (128k context window, Text-to-SQL pipeline)
* **Database:** MySQL 8.0 (`pegasus_db`)
* **DevOps & Containerization:** Docker, Docker Compose, WSL2 (Ubuntu)

---

## 📁 Project Directory Structure

```text
pegasus/
├── docker-compose.yml          # Container orchestration for App & MySQL
├── backend/
│   ├── Dockerfile              # Backend Node.js container config
│   ├── package.json
│   ├── server.js               # Express server, Ollama API proxy & SQL runner
│   └── .env                    # DB credentials, JWT secret, Ollama endpoint
├── frontend/
│   ├── Dockerfile              # Frontend Vite/React container config
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx             # React Router setup & protected routes
│       ├── main.jsx
│       └── components/
│           ├── Login.jsx       # Energy Core glassmorphic login screen
│           ├── Dashboard.jsx   # Highcharts cross-filtering analytics
│           ├── DataHub.jsx     # Excel upload, data cleaner & inline CRUD
│           └── AIAssistant.jsx # Siri-style animated orb UI with Ollama
└── README.md

```

---

## 🗄️ Database Schema (`pegasus_db`)

The platform relies on a relational star/snowflake schema with a uniﬁed view for high-performance AI querying.

```sql
USE pegasus_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Clients Dimension
CREATE TABLE dim_clients (
    code_client VARCHAR(50) PRIMARY KEY,
    nom_client VARCHAR(255) NOT NULL
);

-- 2. Articles Dimension
CREATE TABLE dim_articles (
    code_article VARCHAR(50) PRIMARY KEY,
    designation VARCHAR(255) NOT NULL,
    prix_unitaire_ref DECIMAL(15, 2) NOT NULL
);

-- 3. Sales Representatives Dimension
CREATE TABLE dim_commerciaux (
    id_commercial INT AUTO_INCREMENT PRIMARY KEY,
    nom_commercial VARCHAR(255) NOT NULL UNIQUE,
    division VARCHAR(50) NOT NULL,
    objectif_annuel DECIMAL(15, 2) NOT NULL
);

-- 4. Invoice Headers Fact Table
CREATE TABLE fact_factures_entetes (
    numero_fac VARCHAR(100) PRIMARY KEY,
    date_facture DATE NOT NULL,
    code_client VARCHAR(50) NOT NULL,
    id_commercial INT NOT NULL,
    total_ht DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (code_client) REFERENCES dim_clients(code_client) ON DELETE RESTRICT,
    FOREIGN KEY (id_commercial) REFERENCES dim_commerciaux(id_commercial) ON DELETE RESTRICT
);

-- 5. Invoice Line Items Fact Table
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

-- 6. Unified Global View (Optimized for Ollama Text-to-SQL)
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

```

---

## 🦙 Ollama Local Setup & Serving

Pegasus uses **Ollama** running locally to provide fully private, zero-latency inference without third-party API costs.

### 1. Install Ollama (Linux / WSL2)

```bash
curl -fsSL https://ollama.com/install.sh | sh

```

### 2. Start the Ollama Daemon

```bash
# Start Ollama service in the background
ollama serve

```

### 3. Pull and Serve the Llama 3.1 Model

```bash
# Pull Llama 3.1 model (8B parameters)
ollama pull llama3.1

# Verify the model is ready
ollama run llama3.1 "Hello, are you ready?"

```

> **Note for Docker usage:** Ensure Ollama listens on all network interfaces (`0.0.0.0`) so backend containers can access host services:
> ```bash
> OLLAMA_HOST=0.0.0.0:11434 ollama serve
> 
> ```
> 
> 

---

## 🐳 Docker Deployment from Scratch

The application is containerized using Docker Compose to orchestrate MySQL, Node.js backend, and Vite frontend environments.

### 1. Environment Variables Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DB_HOST=mysql_db
DB_USER=pegasus_user
DB_PASSWORD=pegasus_pass
DB_NAME=pegasus_db
JWT_SECRET=your_pegasus_jwt_secret_key_2026
OLLAMA_URL=http://host.docker.internal:11434

```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api

```

### 2. `docker-compose.yml` Configuration

```yaml
version: '3.8'

services:
  mysql_db:
    image: mysql:8.0
    container_name: pegasus_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_pass
      MYSQL_DATABASE: pegasus_db
      MYSQL_USER: pegasus_user
      MYSQL_PASSWORD: pegasus_pass
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql

  backend:
    build: ./backend
    container_name: pegasus_backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=mysql_db
      - OLLAMA_URL=http://host.docker.internal:11434
    depends_on:
      - mysql_db
    extra_hosts:
      - "host.docker.internal:host-gateway"

  frontend:
    build: ./frontend
    container_name: pegasus_frontend
    restart: always
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  db_data:

```

### 3. Docker Management Commands

```bash
# Build and start all containers in detached mode
docker compose up --build -d

# Check running container status
docker compose ps

# View live logs for backend and AI queries
docker compose logs -f backend

# Restart backend service after prompt modifications
docker compose restart backend

# Stop and remove all containers and networks
docker compose down

```

---

## 💻 Local Development Setup (Without Docker)

If running directly on your host machine:

### Backend Setup

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000

```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Vite server runs on http://localhost:5173

```

---

## 🔑 Key System Features

1. **AI Assistant Page (`/ia`):**
* Natural language to SQL query execution with prompt engineering guardrails.
* Fluid **Energy Core** animated background orbs with chaotic drifting and morphing gradients.
* Structured 4-part AI responses: **📊 Constat**, **💡 Analyse**, **🚀 Recommandation**, **🔮 Prédiction**.
* Strict currency output forced to **MAD** (Moroccan Dirham).
* Instant client-side **PDF Export** (`html2pdf.js`) and **Copy to Clipboard** capabilities.


2. **Analytics Dashboard (`/`):**
* Highcharts cross-filtering system (Bar, Donut, YoY Comparison, Bubble Portfolio, Sankey Revenue Flow).
* Real-time KPI summaries.
* Collapsible desktop and mobile sidebar drawer.


3. **DataHub (`/datahub`):**
* Excel (`.xlsx`, `.csv`) drag-and-drop file parser and automated cleaner.
* Direct database synchronization for client master data.
* Inline CRUD table editor for Commerciaux, Clients, and Articles.
