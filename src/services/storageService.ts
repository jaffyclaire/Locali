import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

// ============================================================================
// Cloudinary Configuration
// ============================================================================
const CLOUDINARY_CLOUD_NAME = "j7xlqkao";
const CLOUDINARY_UPLOAD_PRESET = "Locali";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
 * Upload local file URI to Cloudinary and return the hosted URL.
 *
 * Uses unsigned upload preset since there is no backend server to sign requests.
 * The upload preset is configured in Cloudinary dashboard with folder restrictions
 * and format limits for security.
 *
 * @param uri - Local file URI from expo-image-picker
 * @param storagePath - Logical path used as the folder/name prefix in Cloudinary
 * @returns Cloudinary-hosted HTTPS URL
 */
export const uploadImageAsync = async (
  uri: string,
  storagePath: string
): Promise<string> => {
  try {
    console.log("[storageService] Starting Cloudinary upload for:", storagePath);

    // Create FormData for Cloudinary unsigned upload
    const formData = new FormData();

    if (Platform.OS === "web") {
      // On web, fetch the URI and convert to a Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob, `${storagePath.replace(/\//g, "_")}.jpg`);
    } else {
      // On native, use the { uri, name, type } object form
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: `${storagePath.replace(/\//g, "_")}.jpg`,
      } as any);
    }

    // Append the unsigned upload preset
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Append folder for organization (use the storagePath's first segment as folder)
    const folder = storagePath.split("/")[0] || "locali";
    formData.append("folder", folder);

    // Log FormData keys to confirm upload_preset is present
    const formDataKeys: string[] = [];
    // @ts-ignore — FormData.entries() is available in React Native
    for (const pair of formData.entries()) {
      formDataKeys.push(pair[0]);
    }
    console.log("[storageService] FormData keys:", formDataKeys);

    // Make the upload request — let fetch set the Content-Type boundary automatically
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[storageService] Cloudinary upload failed:", data);
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    const downloadUrl = data.secure_url;
    console.log("[storageService] Cloudinary upload complete:", downloadUrl);
    return downloadUrl;
  } catch (err) {
    console.error("[storageService] uploadImageAsync error:", err);
    throw err;
  }
};
