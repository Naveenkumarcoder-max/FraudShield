import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./GeographicFraudAnalysis.css";

// Approximate city-center coordinates. These are city-level locations,
// not the exact locations of individual transactions.
const CITY_COORDINATES = {
  chennai: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  coimbatore: [11.0168, 76.9558],
  mumbai: [19.076, 72.8777],
  indore: [22.7196, 75.8577],
};

function MapUpdater({ transactions }) {
  const map = useMap();

  useEffect(() => {
    if (transactions.length === 1) {
      map.setView(transactions[0].coordinates, 7);
    } else if (transactions.length > 1) {
      const bounds = transactions.map((txn) => txn.coordinates);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 7 });
    }
  }, [map, transactions]);

  return null;
}

function GeographicFraudAnalysis({ transactions = [] }) {
  const mappedTransactions = useMemo(() => {
    return transactions
      .map((txn) => {
        const latitude = Number(txn.latitude ?? txn.lat);
        const longitude = Number(txn.longitude ?? txn.lng ?? txn.lon);
        const hasCoordinates =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180;

        if (hasCoordinates) {
          return { ...txn, coordinates: [latitude, longitude] };
        }

        const cityKey = String(txn.location ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

        const cityCoordinates = CITY_COORDINATES[cityKey];

        if (!cityCoordinates) return null;

        return { ...txn, coordinates: cityCoordinates };
      })
      .filter(Boolean);
  }, [transactions]);

  const getColor = (status) => {
    const normalizedStatus = String(status ?? "").toLowerCase();

    if (
      normalizedStatus.includes("fraud") ||
      normalizedStatus.includes("flag")
    ) {
      return "#ef4444";
    }

    if (
      normalizedStatus.includes("review") ||
      normalizedStatus.includes("suspicious") ||
      normalizedStatus.includes("pending")
    ) {
      return "#f59e0b";
    }

    return "#22c55e";
  };

  const flaggedCount = mappedTransactions.filter((txn) => {
    const status = String(txn.status ?? "").toLowerCase();
    return status.includes("fraud") || status.includes("flag");
  }).length;

  return (
    <section className="geo-analysis" id="geographic-analysis">
      <div className="geo-heading">
        <div>
          <span className="geo-kicker">LOCATION INTELLIGENCE</span>
          <h2>Geographic Fraud Analysis</h2>
          <p>
            Explore transaction cities and identify areas with suspicious
            activity. Markers use approximate city-center coordinates when
            exact coordinates are unavailable.
          </p>
        </div>
      </div>

      <div className="geo-stats">
        <div>
          <span>Mapped Transactions</span>
          <strong>{mappedTransactions.length}</strong>
        </div>
        <div>
          <span>Flagged Transactions</span>
          <strong>{flaggedCount}</strong>
        </div>
      </div>

      <div className="geo-map">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={4}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater transactions={mappedTransactions} />

          {mappedTransactions.map((txn, index) => {
            const color = getColor(txn.status);

            return (
              <CircleMarker
                key={txn.id ?? txn.transaction_id ?? index}
                center={txn.coordinates}
                radius={9}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.75,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>
                    {txn.id ?? txn.transaction_id ?? "Transaction"}
                  </strong>
                  <br />
                  Location: {txn.location ?? "Unknown"}
                  <br />
                  Amount: ₹
                  {Number(txn.amount ?? 0).toLocaleString("en-IN")}
                  <br />
                  Risk: {txn.riskScore ?? txn.risk_score ?? 0}
                  <br />
                  Status: {txn.status ?? "Unknown"}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="geo-legend">
        <span><i className="geo-safe" /> Safe</span>
        <span><i className="geo-review" /> Review</span>
        <span><i className="geo-flagged" /> Fraud / Flagged</span>
      </div>

      {mappedTransactions.length === 0 && (
        <p className="geo-empty">
          No mappable city locations were found. Add a supported city name or
          latitude and longitude to a transaction to display it on the map.
        </p>
      )}

      <p className="geo-empty">
        City markers represent approximate city centers, not precise
        transaction addresses. Unknown locations and online-only merchants
        are not plotted.
      </p>
    </section>
  );
}

export default GeographicFraudAnalysis;
