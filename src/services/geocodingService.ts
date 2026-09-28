import { Platform } from "react-native";

/**
 * Nominatim (OpenStreetMap) geocoding service.
 *
 * Policy: at most 1 request per second. We throttle with a simple
 * timestamp-based guard. On native we send a User-Agent header
 * (required by Nominatim policy); browsers forbid setting User-Agent,
 * so we skip it on web.
 *
 * NOTE: If this app scales, move to a paid geocoding provider (Google,
 * Mapbox, etc.) for higher rate limits and better reliability.
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
 * Forward geocode an address string into up to 5 results.
 */
export const geocodeAddress = async (
  address: string
): Promise<GeocodeResult[]> => {
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&limit=5&q=${encodeURIComponent(
      address
    )}`;
    const response = await throttledFetch(url);
    const data = await response.json();
    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        label: shortLabel(item.display_name),
        displayName: item.display_name,
      }));
    }
    return [];
  } catch (err) {
    console.warn("[geocodingService] geocodeAddress error:", err);
    return [];
  }
};

// ============================================================================
// Distance & open-now utilities for filter chips
// ============================================================================

/**
 * Calculate distance in km between two coordinates using the Haversine formula.
 */
export const haversineDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DAY_MAP: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/**
 * Check if a merchant is open right now based on its weeklyHours.
 * Returns true if the current time falls within the merchant's hours
 * for the current day. Also respects the isOpen flag.
 */
export const isMerchantOpenNow = (
  weeklyHours: Record<string, { openTime: string; closeTime: string; isClosed: boolean }> | undefined,
  isOpen: boolean | undefined
): boolean => {
  if (isOpen === false) return false;
  if (!weeklyHours) return true;

  const now = new Date();
  const dayName = DAY_MAP[now.getDay()];
  const dayHours = weeklyHours[dayName];
  if (!dayHours || dayHours.isClosed) return false;

  const openTime = dayHours.openTime;
  const closeTime = dayHours.closeTime;
  if (!openTime || !closeTime) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};
