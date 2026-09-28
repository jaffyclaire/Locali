import { useState, useCallback, useRef, useEffect } from "react";
import * as Location from "expo-location";
import {
  reverseGeocode,
  geocodeAddress,
  GeocodeResult,
} from "../services/geocodingService";

export interface AddressPinState {
  label: string;
  lat: number;
  lng: number;
}

interface UseAddressPinOptions {
  initial?: AddressPinState | null;
  onChange?: (state: AddressPinState) => void;
}

/**
 * Two-way binding between an address text input and a map pin.
 *
 * - Typing an address debounces, calls Nominatim search, shows suggestions.
 * - Tapping a suggestion or moving the pin reverse-geocodes and updates the input.
 * - "Use my current location" uses expo-location, then reverse-geocodes.
 * - Stale search responses are ignored if the pin has moved on.
 */
export const useAddressPin = (options?: UseAddressPinOptions) => {
  const [label, setLabel] = useState(options?.initial?.label || "");
  const [lat, setLat] = useState(options?.initial?.lat ?? 37.7749);
  const [lng, setLng] = useState(options?.initial?.lng ?? -122.4194);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monotonic counter to discard stale async responses
  const requestCounter = useRef(0);
  // Debounce timer for address search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent of changes
  const emitChange = useCallback(
    (newLabel: string, newLat: number, newLng: number) => {
      options?.onChange?.({ label: newLabel, lat: newLat, lng: newLng });
    },
    [options?.onChange]
  );

  // Reverse geocode coordinates → update label
  const doReverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      const myRequest = ++requestCounter.current;
      setGeocoding(true);
      setErrorMessage(null);
      const result = await reverseGeocode(latitude, longitude);
      // Ignore if a newer request has been made
      if (myRequest !== requestCounter.current) return;
      setGeocoding(false);
      if (result) {
        setLabel(result.displayName);
        emitChange(result.displayName, latitude, longitude);
      } else {
        setErrorMessage("Could not find address for this location.");
      }
    },
    [emitChange]
  );

  // Forward geocode an address string → show suggestions
  const doForwardGeocode = useCallback(async (address: string) => {
    const myRequest = ++requestCounter.current;
    setSearching(true);
    setErrorMessage(null);
    const results = await geocodeAddress(address);
    // Ignore if a newer request has been made
    if (myRequest !== requestCounter.current) return;
    setSearching(false);
    if (results && results.length > 0) {
      setSuggestions(results);
    } else {
      setSuggestions([]);
      setErrorMessage(
        "Couldn't find that address. You can drag the pin instead."
      );
    }
  }, []);

  // Handle address input change with debounce
  const handleAddressChange = useCallback(
    (text: string) => {
      setLabel(text);
      setErrorMessage(null);
      setSuggestions([]);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (text.trim().length < 3) return;

      debounceTimer.current = setTimeout(() => {
        doForwardGeocode(text.trim());
      }, 800);
    },
    [doForwardGeocode]
  );

  // Handle suggestion tap
  const handleSuggestionTap = useCallback(
    (result: GeocodeResult) => {
      // Invalidate any in-flight search
      requestCounter.current++;
      setSuggestions([]);
      setLabel(result.displayName);
      setLat(result.lat);
      setLng(result.lng);
      setErrorMessage(null);
      emitChange(result.displayName, result.lat, result.lng);
    },
    [emitChange]
  );

  // Handle map tap or pin drag end
  const handlePinChange = useCallback(
    (coordinate: { latitude: number; longitude: number }) => {
      setLat(coordinate.latitude);
      setLng(coordinate.longitude);
      doReverseGeocode(coordinate.latitude, coordinate.longitude);
    },
    [doReverseGeocode]
  );

  // Use current device location
  const handleUseCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Location permission denied.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setLat(latitude);
      setLng(longitude);
      doReverseGeocode(latitude, longitude);
    } catch (err) {
      console.warn("[useAddressPin] getCurrentPosition error:", err);
      setErrorMessage("Could not get your location.");
    }
  }, [doReverseGeocode]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    label,
    lat,
    lng,
    suggestions,
    searching,
    geocoding,
    errorMessage,
    handleAddressChange,
    handleSuggestionTap,
    handlePinChange,
    handleUseCurrentLocation,
    setLabel,
    setLat,
    setLng,
  };
};
