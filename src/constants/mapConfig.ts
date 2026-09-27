/**
 * Map configuration constants for the Locali app.
 */

export const DEFAULT_MAP_CENTER = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export const DEFAULT_MAP_ZOOM = 14;

export const MAP_STYLE = {
  standard: "standard",
  satellite: "satellite",
  hybrid: "hybrid",
} as const;

export type MapStyle = (typeof MAP_STYLE)[keyof typeof MAP_STYLE];

export const MAP_PROVIDERS = {
  apple: "apple",
  google: "google",
} as const;

export type MapProvider = (typeof MAP_PROVIDERS)[keyof typeof MAP_PROVIDERS];

export const LOCATION_ACCURACY = {
  high: "high",
  balanced: "balanced",
  low: "low",
  passive: "passive",
} as const;

export type LocationAccuracy =
  (typeof LOCATION_ACCURACY)[keyof typeof LOCATION_ACCURACY];

export const MAX_MAP_ZOOM = 20;
export const MIN_MAP_ZOOM = 3;
