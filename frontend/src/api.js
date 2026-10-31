
const API_BASE_URL = import.meta.env.DEV
  ? "http://127.0.0.1:5000"
  : (
      import.meta.env.VITE_API_BASE_URL ||
      "https://fraud-shield-sepia.vercel.app"
    );

async function apiRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `Cannot reach Flask backend at ${API_BASE_URL}. Make sure Flask is running.`,
      { cause: error }
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `API error: ${response.status}`
    );
  }

  return data;
}

export function getDashboardStats() {
  return apiRequest("/api/dashboard/stats");
}

export function getTransactions() {
  return apiRequest("/api/transactions");
}

export function checkBackendHealth() {
  return apiRequest("/api/health");
}

export function createTransaction(transaction) {
  return apiRequest("/api/transactions", {
    method: "POST",
    body: JSON.stringify(transaction),
  });
}
