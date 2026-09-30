import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  CloseIcon,
  PhotoUploadIcon,
} from "../../src/components/icons/AppIcons";
import {
  pickMultipleImagesFromGallery,
  uploadImageAsync,
} from "../../src/services/storageService";
import {
  fetchMerchantByOwner,
  createMerchantPost,
} from "../../src/services/firestoreService";
import { Merchant } from "../../src/types";

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuthRole();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [postCaption, setPostCaption] = useState("");
  const [postImageUris, setPostImageUris] = useState<string[]>([]);
  const [creatingPost, setCreatingPost] = useState(false);
  const [loadingMerchant, setLoadingMerchant] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    fetchMerchantByOwner(user.uid)
      .then((m) => {
        setMerchant(m);
      })
      .catch((err) => {
        console.warn("fetchMerchantByOwner error:", err);
      })
      .finally(() => {
        setLoadingMerchant(false);
      });
  }, [user?.uid]);

  const handlePickPostImages = async () => {
    try {
      const uris = await pickMultipleImagesFromGallery();
      if (uris.length > 0) {
        setPostImageUris((prev) => [...prev, ...uris]);
      }
    } catch (err) {
      console.error("handlePickPostImages error:", err);
    }
  };

  const handleRemovePostImage = (indexToRemove: number) => {
    setPostImageUris((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreatePost = async () => {
    if (!merchant) {
      Alert.alert("Error", "Merchant profile not found.");
      return;
    }
    if (!postCaption.trim() && postImageUris.length === 0) {
      Alert.alert("Error", "Please add a caption or at least one photo.");
      return;
    }

    try {
      setCreatingPost(true);
      const uploadedUrls: string[] = [];

      // Upload each selected image to Cloudinary
      for (let i = 0; i < postImageUris.length; i++) {
        const uri = postImageUris[i];
        const remotePath = `merchants/${merchant.id}/posts/${Date.now()}_${i}.jpg`;
        const downloadUrl = await uploadImageAsync(uri, remotePath);
        if (downloadUrl) {
          uploadedUrls.push(downloadUrl);
        }
      }

      await createMerchantPost(String(merchant.id), {
        images: uploadedUrls,
        caption: postCaption.trim(),
        type: "update",
      });

      // Clear state
      setPostCaption("");
      setPostImageUris([]);

      // Navigate back to dashboard/shop
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(merchant)/dashboard");
      }
    } catch (err) {
      console.error("handleCreatePost error:", err);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setCreatingPost(false);
    }
  };

  const isPostDisabled =
    creatingPost || (!postCaption.trim() && postImageUris.length === 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(merchant)/dashboard");
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}
            accessibilityLabel="Close create post"
          >
            <CloseIcon size={20} color={Colors.slate[700]} />
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Create post</Text>

          <TouchableOpacity
            style={[styles.headerPostBtn, isPostDisabled && styles.headerPostBtnDisabled]}
            onPress={handleCreatePost}
            disabled={isPostDisabled}
            activeOpacity={0.8}
          >
            {creatingPost ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.headerPostBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {loadingMerchant ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.teal[700]} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Business Header: Avatar + Business Name + Public Badge */}
            <View style={styles.businessHeader}>
              {merchant?.coverPhotoUrl || (merchant?.photos && merchant.photos[0]) ? (
                <Image
                  source={{ uri: merchant.coverPhotoUrl || merchant.photos?.[0] }}
                  style={styles.businessAvatar}
                />
              ) : (
                <View style={styles.businessAvatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(merchant?.name || "M").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.businessName}>
                  {merchant?.name || "Your Business"}
                </Text>
                <View style={styles.publicBadge}>
                  <Text style={styles.publicBadgeText}>Public</Text>
                </View>
              </View>
            </View>

            {/* Single Open Text Area */}
            <TextInput
              style={styles.captionInput}
              value={postCaption}
              onChangeText={setPostCaption}
              placeholder={`What's on your mind, ${merchant?.name || "your business"}?`}
              placeholderTextColor={Colors.slate[400]}
              multiline
              autoFocus
              textAlignVertical="top"
            />

            {/* Photos Preview Grid / Row */}
            {postImageUris.length > 0 && (
              <View style={styles.selectedPhotosSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoThumbnailsRow}
                >
                  {postImageUris.map((uri, idx) => (
                    <View key={idx} style={styles.thumbnailWrap}>
                      <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => handleRemovePostImage(idx)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <CloseIcon size={12} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* "Add Photos" area (dashed border box with photo icon) */}
            <TouchableOpacity
              style={styles.addPhotosBox}
              onPress={handlePickPostImages}
              activeOpacity={0.8}
            >
              <View style={styles.addPhotosIconWrap}>
                <PhotoUploadIcon size={24} color={Colors.emerald[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addPhotosTitle}>
                  {postImageUris.length > 0 ? "Add more photos" : "Add photos"}
                </Text>
                <Text style={styles.addPhotosSub}>
                  Select multiple photos to feature in this post
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bottom Post Button */}
            <TouchableOpacity
              style={[styles.bottomPostButton, isPostDisabled && styles.bottomPostButtonDisabled]}
              onPress={handleCreatePost}
              disabled={isPostDisabled}
              activeOpacity={0.85}
            >
              {creatingPost ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.bottomPostButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    backgroundColor: Colors.white,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  headerPostBtn: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPostBtnDisabled: {
    backgroundColor: Colors.slate[200],
  },
  headerPostBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  businessAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.slate[100],
  },
  businessAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  businessName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  publicBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  captionInput: {
    fontSize: 16,
    color: Colors.slate[900],
    minHeight: 120,
    textAlignVertical: "top",
    paddingVertical: 8,
    lineHeight: 22,
  },
  selectedPhotosSection: {
    marginVertical: 12,
  },
  photoThumbnailsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  thumbnailWrap: {
    position: "relative",
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: Radius.xl,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotosBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: Colors.slate[200],
    borderStyle: "dashed",
    borderRadius: Radius["2xl"],
    padding: 16,
    backgroundColor: Colors.slate[50],
    marginTop: 8,
    marginBottom: 24,
  },
  addPhotosIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotosTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  addPhotosSub: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  bottomPostButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 14,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  bottomPostButtonDisabled: {
    backgroundColor: Colors.slate[200],
  },
  bottomPostButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
});
