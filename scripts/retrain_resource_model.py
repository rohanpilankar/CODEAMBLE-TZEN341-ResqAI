"""
ResqAI - Retrain & Export Resource Allocation Model
===================================================
Retrains the multi-output RandomForestRegressor model for resource allocation
and saves numpy 2.x / Python 3.14 compatible uncompressed pickle artifacts.
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "processed" / "resource_allocation_dataset.csv"
MODELS_DIR = BASE_DIR / "models"

NUMERIC_FEATURES = [
    "Severity", "People_Count", "Children_Count", "Elderly_Count",
    "Injured_Count", "Time_Since_Incident", "Priority_Score"
]

CATEGORICAL_FEATURES = [
    "Disaster_Type", "Road_Accessibility", "Weather_Condition",
    "Location_Type", "Incident_Time", "Infrastructure_Damage",
    "Communication_Available", "Evacuation_Required", "Priority"
]

TARGET_COLUMNS = [
    "Ambulances", "Doctors", "Nurses", "Medical_Kits", "Mobile_Medical_Units",
    "Rescue_Teams", "Fire_Trucks", "Rescue_Boats", "Helicopters", "Rescue_Drones",
    "Police", "Volunteers", "Food_Packets", "Water_Bottles", "Temporary_Shelters",
    "Supply_Trucks", "Bulldozers", "Excavators", "Cranes", "Power_Generators",
    "Communication_Units", "Fuel_Tankers", "Search_Dogs"
]

def main():
    print(f"[1] Loading dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    
    # Feature One-Hot Encoding
    X_raw = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES].copy()
    y = df[TARGET_COLUMNS].copy()
    
    X_encoded = pd.get_dummies(X_raw, columns=CATEGORICAL_FEATURES, drop_first=False)
    feature_columns = list(X_encoded.columns)
    
    print(f"    Feature Vector Length: {len(feature_columns)}")
    print(f"    Target Vector Length: {len(TARGET_COLUMNS)}")
    
    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.15, random_state=42
    )
    
    # Scale numeric columns
    scaler = StandardScaler()
    scaler.fit(X_train[NUMERIC_FEATURES])
    
    # Scale numerical part of X_train & X_test
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    X_train_scaled[NUMERIC_FEATURES] = scaler.transform(X_train[NUMERIC_FEATURES])
    X_test_scaled[NUMERIC_FEATURES] = scaler.transform(X_test[NUMERIC_FEATURES])
    
    print("[2] Training RandomForestRegressor model...")
    model = RandomForestRegressor(
        n_estimators=30,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    
    y_pred = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred)
    print(f"    [SUCCESS] Trained Model Multi-Output R2 Score: {r2:.4f}")
    
    # Export artifacts without joblib compression to ensure numpy 2.x compatibility
    model_path = MODELS_DIR / "resource_allocation_model.pkl"
    scaler_path = MODELS_DIR / "resource_scaler.pkl"
    cols_path = MODELS_DIR / "resource_feature_columns.pkl"
    
    print(f"[3] Exporting model artifacts to: {MODELS_DIR}")
    joblib.dump(model, model_path, compress=0)
    joblib.dump(scaler, scaler_path, compress=0)
    joblib.dump(feature_columns, cols_path, compress=0)
    
    print("    [SUCCESS] All resource model artifacts successfully retrained & exported!")

if __name__ == "__main__":
    main()
