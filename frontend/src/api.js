
const API_BASE_URL = "http://127.0.0.1:5000";

// 1. Fetch dashboard statistics
export async function getDashboardStats() {
  const response = await fetch(
    `${API_BASE_URL}/api/dashboard/stats`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard statistics");
  }

  return response.json();
}

// 2. Fetch all transactions
export async function getTransactions() {
  const response = await fetch(
    `${API_BASE_URL}/api/transactions`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json();
}

// 3. Check backend health
export async function checkBackendHealth() {
  const response = await fetch(
    `${API_BASE_URL}/api/health`
  );

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}

// 4. Create and save a new transaction
export async function createTransaction(transaction) {
  const response = await fetch(
    `${API_BASE_URL}/api/transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transaction),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to create transaction"
    );
  }

  return data;
}
