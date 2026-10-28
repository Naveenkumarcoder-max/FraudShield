
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "creditcard.csv"

print("Loading credit-card fraud dataset...")

df = pd.read_csv(DATASET_PATH)

X = df.drop(columns=["Class"])
y = df["Class"]

# Keep fraud and legitimate transactions represented in both sets.
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print(f"Training rows: {len(X_train):,}")
print(f"Testing rows:  {len(X_test):,}")
print("\nTraining evaluation model...")

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=12,
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
)

model.fit(X_train, y_train)
predictions = model.predict(X_test)

print("\n" + "=" * 45)
print("       FRAUDSHIELD MODEL EVALUATION")
print("=" * 45)

print(f"Accuracy:  {accuracy_score(y_test, predictions):.4f}")
print(
    f"Precision: {precision_score(y_test, predictions, zero_division=0):.4f}"
)
print(
    f"Recall:    {recall_score(y_test, predictions, zero_division=0):.4f}"
)
print(f"F1-score:  {f1_score(y_test, predictions, zero_division=0):.4f}")

matrix = confusion_matrix(y_test, predictions, labels=[0, 1])

print("\nConfusion Matrix")
print("Rows = actual; columns = predicted")
print("                 Predicted Legitimate  Predicted Fraud")
print(f"Actual Legitimate       {matrix[0][0]:<12}      {matrix[0][1]}")
print(f"Actual Fraud            {matrix[1][0]:<12}      {matrix[1][1]}")

print("\nDetailed Classification Report")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Legitimate", "Fraud"],
        zero_division=0,
    )
)
