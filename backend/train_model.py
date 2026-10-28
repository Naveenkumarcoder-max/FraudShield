
from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
)

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "creditcard.csv"
MODEL_PATH = BASE_DIR / "fraud_model.joblib"

# 1. Load the labeled dataset
if not DATA_PATH.exists():
    raise FileNotFoundError(
        f"Dataset not found: {DATA_PATH}\n"
        "Download creditcard.csv and place it in the backend/data folder."
    )

df = pd.read_csv(DATA_PATH)

# 2. Check that the expected columns exist
required_columns = {"Amount", "Class"}
if not required_columns.issubset(df.columns):
    raise ValueError(
        "Unexpected dataset format. Expected Amount and Class columns."
    )

if df["Class"].nunique() != 2:
    raise ValueError("Expected both legitimate and fraud labels.")

# Exclude the target label from the input features.
# Time and V1-V28 are included when present in this dataset.
feature_columns = [
    column for column in df.columns if column != "Class"
]

X = df[feature_columns]
y = df["Class"].astype(int)

if X.isnull().any().any():
    raise ValueError("Dataset contains missing feature values.")

if not set(y.unique()).issubset({0, 1}):
    raise ValueError("Class must contain only 0 and 1.")

print("Dataset loaded:", df.shape)
print("Legitimate transactions:", int((y == 0).sum()))
print("Fraudulent transactions:", int((y == 1).sum()))

# 3. Split before training to keep test records unseen
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

# 4. Train a baseline model with extra weight for rare fraud cases
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=12,
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
)

print("Training Random Forest...")
model.fit(X_train, y_train)

# 5. Evaluate on the held-out test set
predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

print("\nConfusion matrix (actual rows, predicted columns):")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

print("\nClassification report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Legitimate", "Fraud"],
        zero_division=0,
    )
)

print(
    "Average precision:",
    round(average_precision_score(y_test, probabilities), 4),
)

# 6. Save the model and the exact feature order
joblib.dump(
    {
        "model": model,
        "feature_columns": feature_columns,
    },
    MODEL_PATH,
)

print("\nSaved model to:", MODEL_PATH)
