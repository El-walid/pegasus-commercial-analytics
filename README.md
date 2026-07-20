# 📊 Pegasus Commercial Data Engine & Analytics Dashboard

An end-to-end data engineering and business intelligence application built to ingest, clean, and analyze commercial sales performance data for industrial equipment manufacturing.

The application automatically processes raw sales logs, performs dynamic data sanitization (deduplication and missing value imputation), renders real-time KPI metrics, and allows seamless export to structured SQLite database formats.

---

## 🛠️ Architecture & Features

* **Data Ingestion & Cleaning:** Reads messy raw Excel logs and handles dynamic data type conversions to ensure Arrow/PyArrow web compatibility.
* **Automated Data Sanitization:** Single-click cleaning tool to strip exact duplicate records and dynamically fill missing values based on data types.
* **Real-Time Analytics:** Calculates top-level business KPIs including total revenue, sales volume, and top-performing cities.
* **On-Demand SQL Export:** Converts cleaned, in-memory Pandas DataFrames directly into an SQLite database file (`.db`) for downstream relational storage.
* **Mock Industrial Data Generator:** Includes a custom script using `Faker` to generate synthetic sales records (engines, alternators, kVA ratings, cities, timestamps).

---

## 📁 Repository Structure

```text
pegasus/
├── app.py                   # Main Streamlit dashboard & processing engine
├── requirements.txt         # Project dependencies
├── .gitignore               # System and environment exclusions
├── excel_files/             # Directory for raw input files
│   └── mock_commercial_data.xlsx
└── scripts/
    └── data_generator.py    # Synthetic industrial sales data script

```

---

## 🚀 Getting Started

### 1. Prerequisites

* Python 3.10+
* Virtual environment (`venv`)

### 2. Installation & Setup

Clone the repository and navigate into the project directory:

```bash
git clone [https://github.com/YOUR_USERNAME/pegasus-commercial-analytics.git](https://github.com/YOUR_USERNAME/pegasus-commercial-analytics.git)
cd pegasus-commercial-analytics

```

Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate

```

Install the required dependencies:

```bash
pip install -r requirements.txt

```

---

## 💡 Usage

### Step 1: Generate Mock Data (Optional)

To test the pipeline with synthetic industrial sales data:

```bash
cd scripts
python3 data_generator.py
cd ..

```

### Step 2: Run the Dashboard

Launch the Streamlit web application:

```bash
streamlit run app.py

```

Open your browser at `http://localhost:8501` to access the dashboard.

---

## 🧰 Tech Stack

* **Language:** Python
* **Data Processing:** Pandas, OpenPyXL
* **UI & Dashboard:** Streamlit
* **Database & Export:** SQLite3
* **Data Generation:** Faker
