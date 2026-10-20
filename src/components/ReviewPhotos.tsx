import React, { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Radius } from "../constants/theme";
import { CloseIcon } from "./icons/AppIcons";

interface ReviewPhotosProps {
  imageUrls?: string[];
}

export const ReviewPhotos: React.FC<ReviewPhotosProps> = ({ imageUrls = [] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  if (!imageUrls.length) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailRow}
      >
        {imageUrls.slice(0, 3).map((uri, index) => (
          <TouchableOpacity
            key={`${uri}-${index}`}
            onPress={() => !failedImages.has(uri) && setSelectedImage(uri)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Open review photo ${index + 1}`}
          >
            {failedImages.has(uri) ? (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.placeholderText}>Image unavailable</Text>
              </View>
            ) : (
              <Image
                source={{ uri }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() =>
                  setFailedImages((current) => new Set(current).add(uri))
                }
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.viewer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
            accessibilityRole="button"
            accessibilityLabel="Close review photo"
          >
            <CloseIcon size={22} color={Colors.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
              onError={() => {
                setFailedImages((current) => new Set(current).add(selectedImage));
                setSelectedImage(null);
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  thumbnailRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.slate[100],
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  placeholderText: {
    color: Colors.slate[500],
    fontSize: 9,
    textAlign: "center",
  },
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
});
