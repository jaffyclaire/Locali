import { Linking, Platform } from "react-native";
import { recordDirectionTap } from "./firestoreService";

/**
 * Open turn-by-turn directions to the given coordinates.
 *
 * On native: uses Linking.openURL with a Google Maps directions URL
 * (works on both iOS and Android).
 * On web: opens Google Maps directions in a new tab.
 *
 * Returns true if the URL was opened, false if coordinates are missing.
 */
export const openDirections = async (
  lat: number | undefined,
  lng: number | undefined,
  name?: string,
  merchantId?: string | number,
  userId?: string | null
): Promise<boolean> => {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return false;
  }

  const destination = `${lat},${lng}`;
  const label = name ? ` (${encodeURIComponent(name)})` : "";

  if (Platform.OS === "web") {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, "_blank");
  } else {
    const url = `http://maps.google.com/maps?daddr=${destination}${label}`;
    await Linking.openURL(url);
  }

  // Record analytics
  if (merchantId) {
    await recordDirectionTap(merchantId, userId);
  }

  return true;
};
