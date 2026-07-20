import pandas as pd
import random
from faker import Faker
import os
from datetime import datetime, timedelta

# Initialize Faker (you can set the locale to French/Morocco if preferred)
fake = Faker('fr_FR')

# 1. Define the Industrial Data Pools
cities = ['Casablanca', 'Marrakech', 'Tanger', 'Agadir', 'Rabat', 'Fès']
engine_brands = ['Volvo Penta', 'FPT Iveco', 'Baudouin', 'Mitsubishi', 'Perkins']
alternator_brands = ['Leroy-Somer', 'Mecc-Alte', 'Stamford', 'Sincro']
kva_ratings = [10, 20, 50, 100, 250, 500, 1000, 2000]
sales_reps = ['Youssef', 'Amine', 'Sara', 'Khadija', 'Mehdi']

# 2. Generate the Mock Data
data = []
num_rows = 500

print(f"Generating {num_rows} rows of mock commercial data...")

for _ in range(num_rows):
    # Generate a random date within the last year
    days_back = random.randint(0, 365)
    hours_back = random.randint(0, 23)
    minutes_back = random.randint(0, 59)
    seconds_back = random.randint(0, 59)
    
    sale_date = datetime.now() - timedelta(
    days=days_back, 
    hours=hours_back, 
    minutes=minutes_back, 
    seconds=seconds_back
)
    
    # Pick random components
    engine = random.choice(engine_brands)
    alternator = random.choice(alternator_brands)
    kva = random.choice(kva_ratings)
    
    # Base price calculation (very simplified: kVA * random multiplier)
    base_price_per_kva = random.uniform(800, 1200) # MAD per kVA
    unit_price = round(kva * base_price_per_kva, 2)
    quantity = random.choices([1, 2, 3, 5, 10], weights=[70, 15, 10, 3, 2])[0]
    total_revenue = unit_price * quantity
    
    # Sometimes leave a client name blank to simulate "messy" real-world data
    client_name = fake.company() if random.random() > 0.05 else None
    
    # Append the row
    data.append({
        'Date_Commande': sale_date.strftime('%Y-%m-%d %H:%M:%S'),
        'Client': client_name,
        'City': random.choice(cities),
        'Commercial': random.choice(sales_reps),
        'Moteur': engine,
        'Alternateur': alternator,
        'Puissance_kVA': kva,
        'Quantite': quantity,
        'Prix_Unitaire_MAD': unit_price,
        'Chiffre_Affaires_MAD': total_revenue
    })

# 3. Create a Pandas DataFrame
df = pd.DataFrame(data)

# Sort by Date chronologically so it looks like a real ledger
df = df.sort_values(by='Date_Commande').reset_index(drop=True)

# 4. Export to Excel
output_path = os.path.join('..', 'excel_files', 'mock_commercial_data.xlsx')

# Ensure the directory exists just in case
os.makedirs(os.path.dirname(output_path), exist_ok=True)

df.to_excel(output_path, index=False, engine='openpyxl')

print(f"Success! Mock data saved to: {os.path.abspath(output_path)}")