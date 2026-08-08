"""
ResqAI — Clean Severity Model Training Script
==============================================
Fixes confirmed target leakage and retrains ML models from scratch.

Leakage Removed:
- impact_score (direct proxy of severity_level — R²=1.0 confirmed)
- Total Deaths, No. Injured, No. Affected, No. Homeless, Total Affected,
  Total Damage ('000 US$)  — the raw variables that compose impact_score

Models Trained:
- Logistic Regression
- Random Forest Classifier
- XGBoost Classifier

Outputs saved to models/
"""

import sys
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib

from pathlib import Path
from datetime import datetime

# ── sklearn ──────────────────────────────────────────────────────────────────
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, confusion_matrix,
    roc_auc_score
)

# ── XGBoost ───────────────────────────────────────────────────────────────────
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════
BASE_DIR          = Path.cwd()
DATA_DIR          = BASE_DIR / "data" / "processed"
MODELS_DIR        = BASE_DIR / "models"
TRAINED_MODELS    = MODELS_DIR / "trained_models"
LABEL_ENCODERS    = MODELS_DIR / "label_encoders"
SCALERS_DIR       = MODELS_DIR / "scalers"
REPORTS_DIR       = MODELS_DIR / "reports"

for d in [TRAINED_MODELS, LABEL_ENCODERS, SCALERS_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "emdat_ai_dataset.csv"

# ═══════════════════════════════════════════════════════════════════════════════
# LEAKAGE DEFINITION  (audit-confirmed: R²=1.000000)
# ═══════════════════════════════════════════════════════════════════════════════
LEAK_COLS = [
    "impact_score",          # direct deterministic proxy of severity_level
    "Total Deaths",          # post-event outcome — used to build impact_score
    "No. Injured",           # post-event outcome — used to build impact_score
    "No. Affected",          # post-event outcome — used to build impact_score
    "No. Homeless",          # post-event outcome — used to build impact_score
    "Total Affected",        # post-event outcome — used to build impact_score
    "Total Damage ('000 US$)",  # post-event outcome (R²<0.13 contribution but same issue)
]

# Identifier / admin columns — no predictive value
ADMIN_COLS = ["DisNo.", "Start Date", "End Date", "Location", "Admin Units"]

# Zero-variance columns — only one unique value across all 429 rows
ZERO_VAR_COLS = ["Disaster Group", "Country"]   # both = 100% single class

TARGET = "severity_level"

# ═══════════════════════════════════════════════════════════════════════════════
# LOAD & VALIDATE
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 1 — Loading Dataset")
print("=" * 70)

df = pd.read_csv(DATASET_PATH)
print(f"  Loaded: {DATASET_PATH.name}")
print(f"  Shape: {df.shape[0]} rows × {df.shape[1]} columns")
print(f"  Target distribution:\n{df[TARGET].value_counts().to_string()}")

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING — strip leakage, build clean X
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 2 — Removing Leakage Columns")
print("=" * 70)

drop_all = [TARGET] + LEAK_COLS + ADMIN_COLS + ZERO_VAR_COLS
# Only drop columns that actually exist
drop_all = [c for c in drop_all if c in df.columns]

X_raw = df.drop(columns=drop_all).copy()
y_raw = df[TARGET].copy()

print(f"  Dropped columns: {drop_all}")
print(f"  Clean feature matrix: {X_raw.shape[0]} rows × {X_raw.shape[1]} features")
print(f"  Features: {X_raw.columns.tolist()}")

# Verify no leakage column is present
for col in LEAK_COLS:
    assert col not in X_raw.columns, f"LEAK DETECTED: {col!r} still in X!"
print("\n  ✅ Leakage verification passed — no leak columns in X")

# ═══════════════════════════════════════════════════════════════════════════════
# PREPROCESSING
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 3 — Preprocessing")
print("=" * 70)

# ── 3a. Fill NaN in numeric columns ──────────────────────────────────────────
numeric_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
for col in numeric_cols:
    X_raw[col] = X_raw[col].fillna(X_raw[col].median())

# ── 3b. Fill NaN in categorical columns ──────────────────────────────────────
cat_cols = X_raw.select_dtypes(include=["object"]).columns.tolist()
for col in cat_cols:
    X_raw[col] = X_raw[col].fillna("Unknown")

print(f"  Numeric cols ({len(numeric_cols)}): {numeric_cols}")
print(f"  Categorical cols ({len(cat_cols)}): {cat_cols}")
print(f"  Remaining NaN: {X_raw.isnull().sum().sum()}")

# ── 3c. One-hot encode categoricals ──────────────────────────────────────────
X_encoded = pd.get_dummies(X_raw, columns=cat_cols, drop_first=False)
print(f"\n  Feature matrix after encoding: {X_encoded.shape[0]} × {X_encoded.shape[1]}")

# ── 3d. Encode target ────────────────────────────────────────────────────────
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y_raw)
class_names = label_encoder.classes_
print(f"\n  Target classes: {list(class_names)}")
print(f"  Encoded classes: {list(range(len(class_names)))}")

# Save label encoder immediately
joblib.dump(label_encoder, LABEL_ENCODERS / "label_encoder.pkl")
print(f"  Saved: label_encoder.pkl → {LABEL_ENCODERS}")

# ── 3e. Train/Test split ──────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
)
print(f"\n  Train size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

# ── 3f. Scale ─────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

joblib.dump(scaler, SCALERS_DIR / "scaler.pkl")
print(f"  Saved: scaler.pkl → {SCALERS_DIR}")

# Also save column order for inference
feature_columns = X_encoded.columns.tolist()
with open(MODELS_DIR / "feature_columns.json", "w") as f:
    json.dump(feature_columns, f, indent=2)
print(f"  Saved: feature_columns.json ({len(feature_columns)} features)")

# ═══════════════════════════════════════════════════════════════════════════════
# EVALUATION HELPER
# ═══════════════════════════════════════════════════════════════════════════════
def evaluate_model(name, model, X_tr, y_tr, X_te, y_te, scaled=False):
    y_pred = model.predict(X_te)
    y_pred_proba = model.predict_proba(X_te) if hasattr(model, "predict_proba") else None

    acc    = accuracy_score(y_te, y_pred)
    prec   = precision_score(y_te, y_pred, average="weighted", zero_division=0)
    rec    = recall_score(y_te, y_pred, average="weighted", zero_division=0)
    f1     = f1_score(y_te, y_pred, average="weighted", zero_division=0)
    cm     = confusion_matrix(y_te, y_pred)
    report = classification_report(y_te, y_pred, target_names=label_encoder.classes_, zero_division=0)

    try:
        auc = roc_auc_score(y_te, y_pred_proba, multi_class="ovr", average="weighted")
    except Exception:
        auc = None

    # Cross-validation F1 on training set (5-fold)
    cv_f1 = cross_val_score(
        model, X_tr, y_tr, cv=5, scoring="f1_weighted"
    )

    print(f"\n{'═'*70}")
    print(f"MODEL: {name}")
    print(f"{'═'*70}")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1 Score  : {f1:.4f}")
    if auc is not None:
        print(f"  ROC-AUC   : {auc:.4f}")
    print(f"  CV F1 (5-fold) : {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"  Classes: {list(label_encoder.classes_)}")
    print(cm)
    print(f"\n  Classification Report:\n{report}")

    return {
        "model": name,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4) if auc else None,
        "cv_f1_mean": round(float(cv_f1.mean()), 4),
        "cv_f1_std": round(float(cv_f1.std()), 4),
        "confusion_matrix": cm.tolist(),
        "classification_report": report,
    }

# ═══════════════════════════════════════════════════════════════════════════════
# TRAIN MODEL 1 — Logistic Regression
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 4 — Training Logistic Regression")
print("=" * 70)

lr = LogisticRegression(
    max_iter=5000,
    random_state=42,
    solver="lbfgs",
    multi_class="multinomial",
    C=1.0
)
lr.fit(X_train_scaled, y_train)
results_lr = evaluate_model("Logistic Regression", lr, X_train_scaled, y_train, X_test_scaled, y_test)

# ═══════════════════════════════════════════════════════════════════════════════
# TRAIN MODEL 2 — Random Forest
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 5 — Training Random Forest")
print("=" * 70)

rf = RandomForestClassifier(
    n_estimators=500,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)
rf.fit(X_train, y_train)
results_rf = evaluate_model("Random Forest", rf, X_train, y_train, X_test, y_test)

# Random Forest feature importance
fi_rf = pd.Series(rf.feature_importances_, index=X_encoded.columns)
fi_rf = fi_rf.sort_values(ascending=False).head(15)
print("\n  Top-15 Feature Importances (Random Forest):")
for feat, score in fi_rf.items():
    print(f"    {feat:<55} {score:.5f}")

# ═══════════════════════════════════════════════════════════════════════════════
# TRAIN MODEL 3 — XGBoost
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 6 — Training XGBoost")
print("=" * 70)

xgb = XGBClassifier(
    objective="multi:softprob",
    num_class=len(class_names),
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    eval_metric="mlogloss",
)
xgb.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)
results_xgb = evaluate_model("XGBoost", xgb, X_train, y_train, X_test, y_test)

# XGBoost feature importance
fi_xgb = pd.Series(xgb.feature_importances_, index=X_encoded.columns)
fi_xgb = fi_xgb.sort_values(ascending=False).head(15)
print("\n  Top-15 Feature Importances (XGBoost):")
for feat, score in fi_xgb.items():
    print(f"    {feat:<55} {score:.5f}")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL COMPARISON
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 7 — Model Comparison")
print("=" * 70)

all_results = [results_lr, results_rf, results_xgb]
df_results = pd.DataFrame(all_results).drop(columns=["confusion_matrix", "classification_report"])
df_results = df_results.set_index("model")
print(df_results.to_string())

# Select best model by F1 Score
best_result = max(all_results, key=lambda r: r["f1_score"])
print(f"\n  🏆 Best Model: {best_result['model']}")
print(f"     F1 Score : {best_result['f1_score']}")
print(f"     Accuracy : {best_result['accuracy']}")
print(f"     ROC-AUC  : {best_result['roc_auc']}")

# ═══════════════════════════════════════════════════════════════════════════════
# SAVE BEST MODEL
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 8 — Saving Models")
print("=" * 70)

# Always save XGBoost as the primary production model (best for tabular data)
# Also save all three for comparison
joblib.dump(lr,  TRAINED_MODELS / "logistic_regression_model.pkl")
joblib.dump(rf,  TRAINED_MODELS / "random_forest_model.pkl")
joblib.dump(xgb, TRAINED_MODELS / "xgb_model.pkl")

print(f"  Saved: logistic_regression_model.pkl")
print(f"  Saved: random_forest_model.pkl")
print(f"  Saved: xgb_model.pkl")

# Save best model explicitly
if best_result["model"] == "Logistic Regression":
    best_model_obj = lr
elif best_result["model"] == "Random Forest":
    best_model_obj = rf
else:
    best_model_obj = xgb

joblib.dump(best_model_obj, TRAINED_MODELS / "best_model.pkl")
print(f"  Saved: best_model.pkl → [{best_result['model']}]")

# ═══════════════════════════════════════════════════════════════════════════════
# SAVE FULL REPORT
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 9 — Saving Training Report")
print("=" * 70)

report_data = {
    "generated_at": datetime.now().isoformat(),
    "dataset": str(DATASET_PATH),
    "total_rows": int(df.shape[0]),
    "total_features_before_fix": int(df.shape[1]),
    "leakage_columns_removed": LEAK_COLS,
    "admin_columns_removed": ADMIN_COLS + ZERO_VAR_COLS,
    "clean_features": feature_columns,
    "total_clean_features": len(feature_columns),
    "train_size": int(X_train.shape[0]),
    "test_size": int(X_test.shape[0]),
    "target": TARGET,
    "classes": list(class_names),
    "leakage_verified_removed": True,
    "models": {r["model"]: {k: v for k, v in r.items() if k not in ["confusion_matrix", "classification_report"]}
               for r in all_results},
    "best_model": best_result["model"],
    "best_model_path": str(TRAINED_MODELS / "best_model.pkl"),
    "saved_artifacts": {
        "best_model":  str(TRAINED_MODELS / "best_model.pkl"),
        "xgb_model":   str(TRAINED_MODELS / "xgb_model.pkl"),
        "rf_model":    str(TRAINED_MODELS / "random_forest_model.pkl"),
        "lr_model":    str(TRAINED_MODELS / "logistic_regression_model.pkl"),
        "label_encoder": str(LABEL_ENCODERS / "label_encoder.pkl"),
        "scaler":       str(SCALERS_DIR / "scaler.pkl"),
        "feature_columns": str(MODELS_DIR / "feature_columns.json"),
    }
}

report_path = REPORTS_DIR / "training_report_v2.json"
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report_data, f, indent=2, ensure_ascii=False)

print(f"  Saved: training_report_v2.json → {REPORTS_DIR}")

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL LEAKAGE VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 10 — Final Leakage Verification")
print("=" * 70)

leaked = [col for col in LEAK_COLS if col in feature_columns]
if leaked:
    print(f"  ❌ LEAKAGE STILL PRESENT: {leaked}")
else:
    print(f"  ✅ No leakage columns detected in final feature set")
    print(f"  ✅ impact_score: NOT in features")
    print(f"  ✅ Total Deaths: NOT in features")
    print(f"  ✅ No. Injured: NOT in features")
    print(f"  ✅ No. Homeless: NOT in features")
    print(f"  ✅ Total Affected: NOT in features")
    print(f"  ✅ Total Damage ('000 US$): NOT in features")

print("\n" + "=" * 70)
print("TRAINING COMPLETE")
print("=" * 70)
print(f"  Best Model : {best_result['model']}")
print(f"  F1 Score   : {best_result['f1_score']}")
print(f"  Accuracy   : {best_result['accuracy']}")
print(f"  All artifacts saved to: {MODELS_DIR}")
