# SEHI Pegasus // Autonomous AI Data Analyst & Analytics Suite

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MySQL](https://img.shields.io/badge/mysql-%2300000f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Llama](https://img.shields.io/badge/Ollama_Llama_3.1-000000?style=for-the-badge&logo=meta&logoColor=white)

**SEHI Pegasus** is a full-stack, enterprise-grade data analytics platform and AI processor designed for high-density business intelligence and natural language Text-to-SQL analysis. Powered by a local **Llama 3.1** model, React, Express, MySQL, and Docker, Pegasus delivers real-time telemetry, interactive visual topologies, and seamless Excel-to-SQL data ingestion within a secure, zero-latency environment.

---

## ⚙️ System Architecture

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Highcharts, React Markdown, `html2pdf.js`
* **Backend:** Node.js, Express, Axios, Multer, XLSX, JWT Authentication
* **Neural Processor:** Ollama running **Llama 3.1** locally (128k context window, specialized Text-to-SQL pipeline)
* **Database:** MySQL 8.0 (`pegasus_db`)
* **DevOps & Containerization:** Docker, Docker Compose, WSL2 (Ubuntu)

---

## 📁 Directory Structure

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
│           ├── Login.jsx       # Energy Core authentication gateway
│           ├── Dashboard.jsx   # Executive Ledger & Highcharts telemetry
│           ├── DataHub.jsx     # Buffer injection, data cleaner & inline CRUD
│           └── AIAssistant.jsx # Neural AI interface with Llama 3.1
└── README.md

```

---

## 🗄️ Database Topology (`pegasus_db`)

The platform relies on a strict relational star/snowflake schema, featuring a uniﬁed view optimized specifically for the Ollama Text-to-SQL engine.

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

-- 6. Unified Global View (Optimized for Ollama Inference)
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

## 🧠 Local LLM Deployment

Pegasus bypasses third-party API dependencies by serving **Ollama** locally, ensuring absolute data privacy and zero-latency analytics processing.

### 1. Engine Initialization (Linux / WSL2)

```bash
curl -fsSL https://ollama.com/install.sh | sh

```

### 2. Boot the Daemon

```bash
# Start Ollama service in the background
ollama serve

```

### 3. Mount the Neural Model

```bash
# Pull Llama 3.1 model (8B parameters)
ollama pull llama3.1

# Verify the model is ready
ollama run llama3.1 "System diagnostic check."

```

> **Note for Docker environments:** Ensure Ollama binds to all network interfaces (`0.0.0.0`) so backend containers can execute API calls against the host:
> ```bash
> OLLAMA_HOST=0.0.0.0:11434 ollama serve
> 
> ```
> 
> 

---

## 🐳 Docker Orchestration

The application environment is strictly containerized using Docker Compose to orchestrate MySQL, the Node.js backend, and the Vite frontend.

### 1. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DB_HOST=mysql_db
DB_USER=pegasus_user
DB_PASSWORD=pegasus_pass
DB_NAME=pegasus_db
JWT_SECRET=your_pegasus_jwt_secret_key_2026
OLLAMA_URL=[http://host.docker.internal:11434](http://host.docker.internal:11434)

```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api

```

### 2. Compose File (`docker-compose.yml`)

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
      - OLLAMA_URL=[http://host.docker.internal:11434](http://host.docker.internal:11434)
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

### 3. Execution Commands

```bash
# Build and ignite all containers in detached mode
docker compose up --build -d

# Verify system status
docker compose ps

# Monitor live telemetry from the backend
docker compose logs -f backend

# Terminate and purge all instances
docker compose down

```

---

## 🔑 Core Capabilities

1. **Neural Assistant Interface (`/ia`):**
* Natural language to SQL query execution with prompt engineering guardrails.
* Dynamic, pulsing **Crimson Core** UI matching the platform's monolithic aesthetic.
* Structured 4-part AI responses: **[CONSTAT]**, **[ANALYSE]**, **[RECOMMANDATION]**, **[PRÉDICTION]**.
* Instant client-side **PDF Export** and **Clipboard** pipeline.


2. **Executive Ledger (`/`):**
* Highcharts cross-filtering system (Bar, Donut, YoY Comparison, Bubble Portfolio, Sankey Revenue Flow).
* Edge-to-edge cinematic grid layout.
* Fully responsive, asymmetric typography scale.


3. **Data Injection Buffer (`/datahub`):**
* Excel (`.xlsx`, `.csv`) parser and automated cleaner.
* Direct database synchronization for client master data.
* Inline, strict-border CRUD table editing for Database Management.



---

## 👤 Architect

**El Walid El Alaoui Fels**

*Computer Systems Engineering Student (Cycle d'Ingénieur) — ISGA Marrakech*

[LinkedIn](https://www.linkedin.com/in/el-walid-el-alaoui-fels/) | [Upwork]([https://github.com/your-github](https://www.upwork.com/freelancers/~01f4844810b3d78bf7)
