import os
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
TRAINED_MODELS = MODELS_DIR / "trained_models"
LABEL_ENCODERS = MODELS_DIR / "label_encoders"
SCALERS_DIR = MODELS_DIR / "scalers"

# Load models and preprocessors
try:
    model = joblib.load(TRAINED_MODELS / "best_model.pkl")
    scaler = joblib.load(SCALERS_DIR / "scaler.pkl")
    label_encoder = joblib.load(LABEL_ENCODERS / "label_encoder.pkl")
    with open(MODELS_DIR / "feature_columns.json", "r") as f:
        feature_columns = json.load(f)
except Exception as e:
    print(f"Error loading models: {e}")
    exit(1)

def predict_severity(input_data: dict) -> dict:
    """
    Predicts disaster severity using the trained ML model.
    input_data: dict containing feature values.
    """
    # 1. Convert input to DataFrame
    df = pd.DataFrame([input_data])
    
    # 2. Align with feature columns used during training
    # Missing columns are filled with 0 (for one-hot encoded categories not present)
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
            
    # Ensure correct column order
    df = df[feature_columns]
    
    # 3. Handle NaNs (same as preprocessing: median for numeric, though here we just fill 0 for simplicity if missing)
    df = df.fillna(0)
    
    # 4. Scale numeric features
    X_scaled = scaler.transform(df)
    
    # 5. Predict
    pred_idx = model.predict(X_scaled)[0]
    pred_proba = model.predict_proba(X_scaled)[0]
    
    # 6. Decode label
    severity_label = label_encoder.inverse_transform([pred_idx])[0]
    confidence = float(np.max(pred_proba))
    
    return {
        "predicted_severity": severity_label,
        "confidence_score": round(confidence, 4),
        "model_used": type(model).__name__
    }

if __name__ == "__main__":
    # Mock input matching expected features (e.g. from EMDAT dataset minus leak cols)
    # The actual columns expected are in feature_columns.json
    sample_input = {
        "Latitude": 19.0760,
        "Longitude": 72.8777,
        "Disaster Subgroup_Climatological": 1,
        "Disaster Type_Drought": 1,
    }
    
    print("Running standalone prediction test...")
    result = predict_severity(sample_input)
    print("Prediction Result:")
    print(json.dumps(result, indent=2))
