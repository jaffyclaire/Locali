import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import MerchantMap from "../MerchantMap";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { LocationIcon, RecenterIcon } from "../icons/AppIcons";
import { useAddressPin, AddressPinState } from "../../hooks/useAddressPin";

interface LocationPickerProps {
  initial?: AddressPinState | null;
  onChange: (state: AddressPinState) => void;
  /** Fixed height for the map. Defaults to 240. */
  mapHeight?: number;
}

/**
 * Reusable two-way location picker.
 *
 * Contains an address text input with Nominatim search suggestions and a
 * draggable map pin. Typing an address moves the pin; moving the pin
 * updates the address. Used in the shopper Home header modal and in
 * merchant-setup step 2.
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({
  initial,
  onChange,
  mapHeight = 240,
}) => {
  const {
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
  } = useAddressPin({ initial, onChange });

  return (
    <View style={styles.container}>
      {/* Address Input */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <LocationIcon size={16} color={Colors.slate[400]} />
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={handleAddressChange}
            placeholder="Search for an address…"
            placeholderTextColor={Colors.slate[400]}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {searching && (
            <ActivityIndicator size="small" color={Colors.teal[700]} />
          )}
        </View>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleUseCurrentLocation}
          activeOpacity={0.7}
        >
          <RecenterIcon size={18} color={Colors.teal[700]} />
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsScroll}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={`${s.lat}-${s.lng}-${i}`}
                style={styles.suggestionRow}
                onPress={() => handleSuggestionTap(s)}
                activeOpacity={0.7}
              >
                <LocationIcon size={14} color={Colors.slate[400]} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {s.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <MerchantMap
          style={styles.map}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          position={{ latitude: lat, longitude: lng }}
          onPinChange={handlePinChange}
          onPress={handlePinChange}
          markers={[
            {
              id: "picker-pin",
              coordinate: { latitude: lat, longitude: lng },
              draggable: true,
              onDragEnd: handlePinChange,
              pinColor: Colors.teal[700],
              pinSize: 36,
              children: (
                <View style={styles.pinContainer}>
                  <LocationIcon size={16} color={Colors.white} />
                </View>
              ),
            },
          ]}
        />
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>
            {geocoding ? "Looking up address…" : "Tap or drag to set location"}
          </Text>
        </View>
      </View>

      {/* Error */}
      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate[900],
    padding: 0,
  },
  locationButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.teal[200],
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    maxHeight: 160,
    ...Shadows.sm,
  },
  suggestionsScroll: {
    paddingVertical: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: Colors.slate[700],
  },
  mapContainer: {
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.slate[200],
  },
  map: {
    width: "100%",
    height: "100%",
  },
  pinContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.md,
  },
  hintBadge: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  hintText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  errorText: {
    fontSize: 12,
    color: Colors.rose[600],
    fontWeight: "500",
  },
});
