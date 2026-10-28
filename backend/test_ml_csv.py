
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "creditcard.csv"
API_URL = "http://127.0.0.1:5000/api/ml/predict-csv"

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

# Use a small sample for the API integration test.
df = pd.read_csv(DATA_PATH, nrows=100)
sample_path = BASE_DIR / "test_sample.csv"
df.to_csv(sample_path, index=False)

boundary = "----FraudShieldCsvBoundary"
csv_bytes = sample_path.read_bytes()

body = (
    f"--{boundary}\r\n"
    'Content-Disposition: form-data; name="file"; '
    'filename="test_sample.csv"\r\n'
    "Content-Type: text/csv\r\n\r\n"
).encode() + csv_bytes + f"\r\n--{boundary}--\r\n".encode()

request = Request(
    API_URL,
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    },
    method="POST",
)

try:
    with urlopen(request, timeout=60) as response:
        result = json.loads(response.read().decode())
        print(json.dumps(result, indent=2))
except HTTPError as error:
    print("HTTP error:", error.code)
    print(error.read().decode())
finally:
    sample_path.unlink(missing_ok=True)
