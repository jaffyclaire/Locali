import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { LocationIcon } from "../icons/AppIcons";

interface CustomMarkerProps {
  type: "standard" | "new" | "sponsored";
  active?: boolean;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
  type,
  active = false,
}) => {
  const getBackgroundColor = () => {
    switch (type) {
      case "new":
        return Colors.emerald[500];
      case "sponsored":
        return Colors.amber[500];
      case "standard":
      default:
        return Colors.teal[700];
    }
  };

  const size = active ? 40 : 32;

  return (
    <View
      style={[
        styles.markerContainer,
        {
          width: size,
          height: size,
          borderRadius: Radius.full,
          backgroundColor: getBackgroundColor(),
        },
        type === "sponsored" && styles.sponsoredOutline,
        active && styles.activeMarker,
      ]}
    >
      <LocationIcon size={active ? 18 : 14} color={Colors.white} />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  sponsoredOutline: {
    borderWidth: 2,
    borderColor: Colors.amber[300],
  },
  activeMarker: {
    borderWidth: 2.5,
    borderColor: Colors.white,
    ...Shadows.lg,
  },
});

