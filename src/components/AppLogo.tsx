import React from "react";
import {
  Image,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Shadows } from "../constants/theme";

interface AppLogoProps {
  size?: number;
  style?: ViewStyle;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, style }) => {
  const borderRadius = size * 0.22;

  return (
    <View style={[styles.shadow, { width: size, height: size }, style]}>
      <View style={[styles.clip, { borderRadius }]}>
        <Image
          source={require("../../assets/icon.png")}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
          accessibilityLabel="Locali app icon"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    marginBottom: 20,
    ...Shadows.sm,
  },
  clip: {
    flex: 1,
    overflow: "hidden",
  },
});
