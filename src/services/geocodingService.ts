import { Platform } from "react-native";

/**
 * Nominatim (OpenStreetMap) geocoding service.
 *
 * Policy: at most 1 request per second. We throttle with a simple
 * timestamp-based guard. On native we send a User-Agent header
 * (required by Nominatim policy); browsers forbid setting User-Agent,
 * so we skip it on web.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const MIN_REQUEST_INTERVAL_MS = 1000;

let lastRequestTime = 0;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (Platform.OS !== "web") {
    headers["User-Agent"] = "Locali/1.0";
  }
  return headers;
}

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: getHeaders() });
}

/**
 * Extract a short readable label from a Nominatim display_name.
 * e.g. "12 Market Street, Downtown, San Francisco, CA, USA"
 *   -> "Downtown, San Francisco"
 */
function shortLabel(displayName: string): string {
  const parts = displayName.split(",").map((s) => s.trim());
  if (parts.length <= 2) return displayName;
  // Skip street address (first part), take next 2 parts
  return parts.slice(1, 3).join(", ");
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  displayName: string;
}

/**
 * Reverse geocode coordinates into a readable label.
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<GeocodeResult | null> => {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await throttledFetch(url);
    const data = await response.json();
    if (data && data.display_name) {
      return {
        lat,
        lng,
        label: shortLabel(data.display_name),
        displayName: data.display_name,
      };
    }
    return null;
  } catch (err) {
    console.warn("[geocodingService] reverseGeocode error:", err);
    return null;
  }
};

/**
 * Forward geocode an address string into coordinates.
 */
export const geocodeAddress = async (
  address: string
): Promise<GeocodeResult | null> => {
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const response = await throttledFetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        label: shortLabel(result.display_name),
        displayName: result.display_name,
      };
    }
    return null;
  } catch (err) {
    console.warn("[geocodingService] geocodeAddress error:", err);
    return null;
  }
};
