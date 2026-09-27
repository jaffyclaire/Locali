import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "../lib/firebase";

/**
 * Pick an image from device gallery for covers or photo gallery
 */
export const pickImageFromGallery = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photo gallery is required.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (err) {
    console.error("pickImageFromGallery error:", err);
    return null;
  }
};

/**
 * Pick an avatar image with 1:1 aspect ratio
 */
export const pickAvatarImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photo gallery is required.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (err) {
    console.error("pickAvatarImage error:", err);
    return null;
  }
};

/**
 * Upload local file URI to Firebase Storage and return download URL
 */
export const uploadImageAsync = async (
  uri: string,
  storagePath: string
): Promise<string> => {
  if (!isFirebaseConfigured()) {
    // Development fallback if Storage is not configured
    return uri;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.error("uploadImageAsync error:", err);
    throw err;
  }
};
