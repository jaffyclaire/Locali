import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

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
      mediaTypes: ["images"],
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
      mediaTypes: ["images"],
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
 * On native: uses expo-file-system/legacy uploadAsync with MULTIPART type,
 * which properly handles React Native's { uri, name, type } file format.
 *
 * On web: uses fetch(uri) -> Blob -> FormData (no manual Content-Type header).
 *
 * @param uri - Local file URI from expo-image-picker
 * @param storagePath - Logical path used as the folder/name prefix in Cloudinary
 * @returns Cloudinary-hosted HTTPS URL
 */
export const uploadImageAsync = async (
  uri: string,
  storagePath: string
): Promise<string> => {
  const folder = storagePath.split("/")[0] || "locali";

  if (Platform.OS === "web") {
    // Web path: fetch URI -> Blob -> FormData (no manual Content-Type header)
    try {
      console.log("[storageService] Starting Cloudinary upload (web) for:", storagePath);

      const response = await fetch(uri);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("file", blob, `${storagePath.replace(/\//g, "_")}.jpg`);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", folder);

      // Log FormData keys to confirm upload_preset is present
      const formDataKeys: string[] = [];
      // @ts-ignore — FormData.entries() is available
      for (const pair of formData.entries()) {
        formDataKeys.push(pair[0]);
      }
      console.log("[storageService] FormData keys:", formDataKeys);

      const uploadResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      const data = await uploadResponse.json();

      if (!uploadResponse.ok) {
        console.error("[storageService] Cloudinary upload failed:", JSON.stringify(data));
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      console.log("[storageService] Cloudinary upload complete, HTTP status:", uploadResponse.status);
      console.log("[storageService] secure_url:", data.secure_url);
      return data.secure_url;
    } catch (err) {
      console.error("[storageService] uploadImageAsync error:", err);
      throw err;
    }
  } else {
    // Native path: use expo-file-system/legacy uploadAsync with MULTIPART
    try {
      console.log("[storageService] Starting Cloudinary upload (native) for:", storagePath);

      const result = await FileSystem.uploadAsync(CLOUDINARY_UPLOAD_URL, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        parameters: {
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          folder: folder,
        },
      });

      console.log("[storageService] Cloudinary upload complete, HTTP status:", result.status);

      const data = JSON.parse(result.body);
      console.log("[storageService] secure_url:", data.secure_url);
      return data.secure_url;
    } catch (err) {
      console.error("[storageService] uploadImageAsync error:", err);
      throw err;
    }
  }
};
