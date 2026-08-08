"""
ResqAI - XGBoost Model Prediction & Benchmark Test (~96% Model Target)
======================================================================
Tests the retrained XGBoost model (xgb_model.pkl) on the realistic dataset
resqai_optimized_dataset_v2.csv (~96% accuracy target) and live custom disaster scenarios.
"""

import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, confusion_matrix,
    roc_auc_score
)

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 75)
    print("      RESQAI — REALISTIC XGBOOST PREDICTION BENCHMARK (~96% TARGET)")
    print("=" * 75)

    BASE_DIR = Path(__file__).resolve().parent
    MODELS_DIR = BASE_DIR / "models"
    TRAINED_MODELS = MODELS_DIR / "trained_models"
    LABEL_ENCODERS = MODELS_DIR / "label_encoders"
    SCALERS_DIR = MODELS_DIR / "scalers"
    DATA_DIR = BASE_DIR / "data" / "processed"

    model_path = TRAINED_MODELS / "xgb_model.pkl"
    scaler_path = SCALERS_DIR / "scaler.pkl"
    encoder_path = LABEL_ENCODERS / "label_encoder.pkl"
    feature_cols_path = MODELS_DIR / "feature_columns.json"
    dataset_path = DATA_DIR / "resqai_optimized_dataset_v2.csv"

    if not dataset_path.exists():
        dataset_path = DATA_DIR / "resqai_optimized_dataset.csv"

    print(f"\n[1] Loading Model Artifacts...")
    xgb_model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    label_encoder = joblib.load(encoder_path)
    with open(feature_cols_path, "r") as f:
        feature_columns = json.load(f)

    print(f"  ✅ Loaded Retrained XGBoost Model: {type(xgb_model).__name__}")
    print(f"  ✅ Loaded Scaler & Label Encoder (Classes: {list(label_encoder.classes_)})")
    print(f"  ✅ Feature Schema Count: {len(feature_columns)}")

    # 2. LOAD DATASET & REPLICATE TEST SPLIT
    print(f"\n[2] Loading Dataset ({dataset_path.name}) & Preparing Test Split...")
    df = pd.read_csv(dataset_path)
    TARGET = "severity_level"
    IGNORE_COLS = ["source", TARGET]

    X_raw = df.drop(columns=[c for c in IGNORE_COLS if c in df.columns]).copy()
    y_raw = df[TARGET].copy()

    cat_cols = X_raw.select_dtypes(include=["object"]).columns.tolist()
    num_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()

    for c in num_cols:
        X_raw[c] = X_raw[c].fillna(X_raw[c].median())
    for c in cat_cols:
        X_raw[c] = X_raw[c].fillna("Unknown")

    X_encoded = pd.get_dummies(X_raw, columns=cat_cols, drop_first=False)
    X_encoded = X_encoded.reindex(columns=feature_columns, fill_value=0)
    y_encoded = label_encoder.transform(y_raw)

    _, X_test, _, y_test = train_test_split(
        X_encoded, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )

    X_test_scaled = scaler.transform(X_test)

    # 3. RUN MODEL PREDICTIONS ON TEST DATA
    print(f"\n[3] Running Predictions on {len(X_test)} Holdout Test Samples...")
    y_pred = xgb_model.predict(X_test_scaled)
    y_proba = xgb_model.predict_proba(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    try:
        auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
    except Exception:
        auc = None

    print("-" * 75)
    print("               OPTIMIZED TEST SET PERFORMANCE METRICS")
    print("-" * 75)
    print(f"  • Accuracy      : \033[1;32m{acc:.4f} ({acc*100:.2f}%)\033[0m")
    print(f"  • Precision     : {prec:.4f}")
    print(f"  • Recall        : {rec:.4f}")
    print(f"  • F1 Score      : \033[1;32m{f1:.4f}\033[0m")
    if auc is not None:
        print(f"  • ROC-AUC (OVR) : {auc:.4f}")

    print("\n[4] Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=label_encoder.classes_, columns=label_encoder.classes_)
    print(cm_df)

    print("\n[5] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_, zero_division=0))

    # 4. FEATURE IMPORTANCE ANALYSIS
    print("-" * 75)
    print("               XGBOOST TOP 10 FEATURE IMPORTANCES")
    print("-" * 75)
    if hasattr(xgb_model, "feature_importances_"):
        importances = xgb_model.feature_importances_
        feat_imp = pd.Series(importances, index=feature_columns).sort_values(ascending=False)
        top_10 = feat_imp.head(10)
        for idx, (feat, score) in enumerate(top_10.items(), 1):
            print(f"  {idx:2d}. {feat:<45} : {score:.4f} ({score*100:.2f}%)")

    # 5. PREDICTING ON CUSTOM DISASTER SCENARIOS
    print("\n" + "=" * 75)
    print("      SCENARIO PREDICTION TESTS (CUSTOM DISASTER INPUTS)")
    print("=" * 75)

    scenarios = [
        {
            "name": "Scenario 1: High Magnitude Earthquake (Himalayan Region)",
            "data": {
                "magnitude": 7.8,
                "depth_km": 15.0,
                "latitude": 28.1,
                "longitude": 84.7,
                "duration_days": 1.0,
                "year": 2026,
                "month": 4,
                "day": 25,
                "day_of_week": 5,
                "is_earthquake": 1,
                "disaster_subgroup_Geophysical": 1,
                "disaster_type_Earthquake": 1,
                "log_magnitude": np.log1p(7.8),
                "log_duration": np.log1p(1.0),
                "seismic_energy_proxy": np.log1p((10.0**(1.5*7.8)) / 25.0)
            }
        },
        {
            "name": "Scenario 2: Severe Tropical Cyclone (Bay of Bengal)",
            "data": {
                "magnitude": 220.0,
                "storm_wind_speed": 220.0,
                "latitude": 19.8,
                "longitude": 85.8,
                "duration_days": 4.0,
                "year": 2026,
                "month": 5,
                "day": 18,
                "day_of_week": 0,
                "is_cyclone": 1,
                "disaster_subgroup_Meteorological": 1,
                "disaster_type_Storm": 1,
                "log_wind_speed": np.log1p(220.0),
                "storm_energy_index": np.log1p((220.0**2)*4.0)
            }
        },
        {
            "name": "Scenario 3: Massive Monsoon Riverine Flood (Assam / Brahmaputra)",
            "data": {
                "magnitude": 8500.0,
                "flood_area_km2": 8500.0,
                "latitude": 26.2,
                "longitude": 91.7,
                "duration_days": 14.0,
                "year": 2026,
                "month": 7,
                "day": 12,
                "day_of_week": 6,
                "is_flood": 1,
                "disaster_subgroup_Hydrological": 1,
                "disaster_type_Flood": 1,
                "log_flood_area": np.log1p(8500.0),
                "flood_impact_proxy": np.log1p(8500.0) * 14.0
            }
        },
        {
            "name": "Scenario 4: Minor Localized Heat Wave / Summer Event",
            "data": {
                "magnitude": 42.0,
                "temperature_c": 42.0,
                "latitude": 15.3,
                "longitude": 75.1,
                "duration_days": 2.0,
                "year": 2026,
                "month": 3,
                "day": 10,
                "day_of_week": 1,
                "disaster_subgroup_Climatological": 1,
                "disaster_type_Extreme temperature": 1
            }
        }
    ]

    for scenario in scenarios:
        s_name = scenario["name"]
        s_data = scenario["data"]

        sample_df = pd.DataFrame([0] * len(feature_columns), index=feature_columns).T
        for k, v in s_data.items():
            if k in sample_df.columns:
                sample_df[k] = v

        sample_scaled = scaler.transform(sample_df)
        pred_code = xgb_model.predict(sample_scaled)[0]
        pred_label = label_encoder.inverse_transform([pred_code])[0]
        probs = xgb_model.predict_proba(sample_scaled)[0]

        prob_dict = {cls: round(float(probs[i]), 4) for i, cls in enumerate(label_encoder.classes_)}
        confidence = prob_dict[pred_label]

        print(f"\n📌 {s_name}")
        print(f"   • Predicted Severity Level : \033[1;33m{pred_label.upper()}\033[0m")
        print(f"   • Confidence Score         : {confidence*100:.2f}%")
        print(f"   • Class Probabilities      : {prob_dict}")

    print("\n" + "=" * 75)
    print("      BENCHMARK TEST COMPLETED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    main()
