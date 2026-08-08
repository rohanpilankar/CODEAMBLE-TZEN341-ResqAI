"""
ResqAI — XGBoost Model Retraining & Hyperparameter Optimization
================================================================
Retrains XGBoost Classifier on the optimized dataset (resqai_optimized_dataset_v2.csv)
targeting realistic ~96% performance.
"""

import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from datetime import datetime

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, confusion_matrix,
    roc_auc_score
)
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
TRAINED_MODELS = MODELS_DIR / "trained_models"
LABEL_ENCODERS = MODELS_DIR / "label_encoders"
SCALERS_DIR = MODELS_DIR / "scalers"
REPORTS_DIR = MODELS_DIR / "reports"

for d in [TRAINED_MODELS, LABEL_ENCODERS, SCALERS_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "resqai_optimized_dataset_v2.csv"
if not DATASET_PATH.exists():
    DATASET_PATH = DATA_DIR / "resqai_optimized_dataset.csv"

def main():
    print("=" * 75)
    print("      RESQAI — OPTIMIZED XGBOOST RETRAINING (~96% TARGET)")
    print("=" * 75)

    if not DATASET_PATH.exists():
        print(f"❌ Dataset not found at {DATASET_PATH}")
        return

    df = pd.read_csv(DATASET_PATH)
    print(f"\n[1] Loaded Dataset: {DATASET_PATH.name}")
    print(f"  • Total Rows: {df.shape[0]} | Columns: {df.shape[1]}")
    print(f"  • Severity Distribution:\n{df['severity_level'].value_counts().to_string()}")

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
    feature_columns = X_encoded.columns.tolist()

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_raw)
    class_names = list(label_encoder.classes_)

    print(f"\n[2] Feature Matrix Prepared:")
    print(f"  • Features Count: {len(feature_columns)}")
    print(f"  • Encoded Classes: {class_names}")

    with open(MODELS_DIR / "feature_columns.json", "w") as f:
        json.dump(feature_columns, f, indent=2)
    joblib.dump(label_encoder, LABEL_ENCODERS / "label_encoder.pkl")
    joblib.dump(label_encoder, LABEL_ENCODERS / "severity_label_encoder.pkl")

    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    joblib.dump(scaler, SCALERS_DIR / "scaler.pkl")

    print(f"\n[3] Train/Test Split:")
    print(f"  • Train Set: {X_train.shape[0]} samples | Test Set: {X_test.shape[0]} samples")

    sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)

    print(f"\n[4] Training Tuned XGBoost Model...")
    tuned_xgb = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.75,
        reg_alpha=0.1,
        reg_lambda=1.5,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1
    )

    tuned_xgb.fit(X_train_scaled, y_train, sample_weight=sample_weights)

    # Evaluate on Holdout Test Set
    print(f"\n[5] Evaluating Tuned XGBoost Model on Test Set...")
    y_pred = tuned_xgb.predict(X_test_scaled)
    y_proba = tuned_xgb.predict_proba(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    try:
        auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
    except Exception:
        auc = None

    print("-" * 75)
    print("           TUNED XGBOOST HOLDOUT TEST PERFORMANCE")
    print("-" * 75)
    print(f"  • Accuracy      : {acc:.4f} ({acc*100:.2f}%)")
    print(f"  • Precision     : {prec:.4f}")
    print(f"  • Recall        : {rec:.4f}")
    print(f"  • F1 Score      : {f1:.4f}")
    if auc is not None:
        print(f"  • ROC-AUC (OVR) : {auc:.4f}")

    print("\n  • Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=class_names, columns=class_names)
    print(cm_df)

    print("\n  • Classification Report:")
    report_text = classification_report(y_test, y_pred, target_names=class_names, zero_division=0)
    print(report_text)

    # Save Model Artifacts
    joblib.dump(tuned_xgb, TRAINED_MODELS / "xgb_model.pkl")
    joblib.dump(tuned_xgb, TRAINED_MODELS / "best_model.pkl")
    print(f"\n  ✅ Saved retrained XGBoost model to {TRAINED_MODELS / 'xgb_model.pkl'}")

    report_json = {
        "generated_at": datetime.now().isoformat(),
        "dataset": str(DATASET_PATH),
        "total_rows": len(df),
        "total_clean_features": len(feature_columns),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "classes": class_names,
        "xgb_performance": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4) if auc else None
        }
    }
    with open(REPORTS_DIR / "training_report_v2.json", "w") as f:
        json.dump(report_json, f, indent=2)

    print(f"  ✅ Updated training report: {REPORTS_DIR / 'training_report_v2.json'}")
    print("=" * 75)

if __name__ == "__main__":
    main()
