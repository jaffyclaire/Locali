import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import MerchantMap from "../MerchantMap";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { LocationIcon, CheckIcon, CloseIcon } from "../icons/AppIcons";
import { reverseGeocode } from "../../services/geocodingService";
import type { MapCoordinate, MerchantMapMarker } from "../MerchantMap.types";
import type { UserLocation } from "../../types";

// Currently unused: no app route imports this modal; retained for a future standalone location flow.
interface LocationPickerModalProps {
  visible: boolean;
  initialLocation?: UserLocation | null;
  onSave: (location: UserLocation) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialLocation,
  onSave,
  onClose,
}) => {
  const [pinCoord, setPinCoord] = useState<MapCoordinate>(
    initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng }
      : { latitude: 37.7749, longitude: -122.4194 }
  );
  const [label, setLabel] = useState<string>(
    initialLocation?.label || "Downtown, SF"
  );
  const [geocoding, setGeocoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMapPress = useCallback(async (coordinate: MapCoordinate) => {
    setPinCoord(coordinate);
    setErrorMessage(null);
    setGeocoding(true);
    const result = await reverseGeocode(coordinate.latitude, coordinate.longitude);
    setGeocoding(false);
    if (result) {
      setLabel(result.label);
    } else {
      setErrorMessage("Could not address this location. Try again.");
    }
  }, []);

  const handleDragEnd = useCallback(async (coordinate: MapCoordinate) => {
    setPinCoord(coordinate);
    setErrorMessage(null);
    setGeocoding(true);
    const result = await reverseGeocode(coordinate.latitude, coordinate.longitude);
    setGeocoding(false);
    if (result) {
      setLabel(result.label);
    } else {
      setErrorMessage("Could not address this location. Try again.");
    }
  }, []);

  const handleSave = () => {
    onSave({ label, lat: pinCoord.latitude, lng: pinCoord.longitude });
  };

  const markers: MerchantMapMarker[] = [
    {
      id: "picker-pin",
      coordinate: pinCoord,
      draggable: true,
      onDragEnd: handleDragEnd,
      pinColor: Colors.teal[700],
      pinSize: 36,
      children: (
        <View style={styles.pinContainer}>
          <LocationIcon size={16} color={Colors.white} />
        </View>
      ),
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <CloseIcon size={20} color={Colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Location</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <CheckIcon size={20} color={Colors.teal[700]} />
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MerchantMap
            style={styles.map}
            initialRegion={{
              latitude: pinCoord.latitude,
              longitude: pinCoord.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            markers={markers}
          />
          <View style={styles.hintBadge}>
            <Text style={styles.hintText}>Tap or drag to set location</Text>
          </View>
        </View>

        {/* Bottom Panel */}
        <View style={styles.bottomPanel}>
          {geocoding ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={Colors.teal[700]} />
              <Text style={styles.statusText}>Looking up address…</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <LocationIcon size={16} color={Colors.teal[700]} />
              <Text style={styles.statusText} numberOfLines={2}>
                {label}
              </Text>
            </View>
          )}

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          <View style={styles.coordRow}>
            <Text style={styles.coordText}>
              {pinCoord.latitude.toFixed(5)}, {pinCoord.longitude.toFixed(5)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveButtonText}>Save Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
    position: "relative",
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
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  bottomPanel: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.slate[100],
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: Colors.rose[600],
    fontWeight: "500",
  },
  coordRow: {
    alignItems: "center",
  },
  coordText: {
    fontSize: 12,
    color: Colors.slate[400],
  },
  saveButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
