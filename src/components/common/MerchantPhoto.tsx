import React from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "../../constants/theme";
import { ShopIcon } from "../icons/AppIcons";

interface MerchantPhotoProps {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
}

export const MerchantPhoto: React.FC<MerchantPhotoProps> = ({ uri, style }) => {
  const imageUri = typeof uri === "string" ? uri.trim() : "";

  return (
    <View style={[style, styles.container]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <ShopIcon size={28} color={Colors.teal[600]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[100],
  },
});