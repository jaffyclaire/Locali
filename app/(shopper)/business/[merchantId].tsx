import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Merchant, MerchantPost } from "../../../src/types";
import { Colors, Radius } from "../../../src/constants/theme";
import { BackArrowIcon } from "../../../src/components/icons/AppIcons";
import { BusinessProfile } from "../../../src/components/BusinessProfile";
import { useAuthRole } from "../../../src/context/AuthRoleContext";
import {
  fetchMerchants,
  getSavedMerchantIds,
  toggleSaveMerchant,
} from "../../../src/services/firestoreService";
import {
  fetchMerchantPostsForCustomer,
  fetchMerchantReviews,
  MerchantReviewWithProfile,
} from "../../../src/services/merchantCommunityService";
import { openDirections } from "../../../src/services/directionsService";

export default function BusinessPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthRole();
  const { merchantId: merchantIdParam } = useLocalSearchParams<{
    merchantId?: string | string[];
  }>();
  const merchantId = Array.isArray(merchantIdParam)
    ? merchantIdParam[0]
    : merchantIdParam;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [posts, setPosts] = useState<MerchantPost[]>([]);
  const [reviews, setReviews] = useState<MerchantReviewWithProfile[]>([]);
  const [reviewsError, setReviewsError] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadBusiness = async () => {
      if (!merchantId) {
        setBusinessError(true);
        setBusinessLoading(false);
        return;
      }

      setBusinessLoading(true);
      setBusinessError(false);
      setPostsError(false);
      try {
        const merchants = await fetchMerchants();
        const found = merchants.find(
          (item) => String(item.id) === merchantId
        );
        if (cancelled) return;
        if (!found) {
          setBusinessError(true);
          return;
        }

        setMerchant(found);
        setPostsLoading(true);
        const [businessPosts, savedMerchantIds, businessReviews] = await Promise.all([
          fetchMerchantPostsForCustomer(String(found.id)).catch((error) => {
            if (!cancelled) {
              setPostsError(true);
              console.warn("[BusinessPage] Failed to load posts:", error);
            }
            return [];
          }),
          user?.uid
            ? getSavedMerchantIds(user.uid)
            : Promise.resolve([]),
          fetchMerchantReviews(String(found.id)).catch((error) => {
            if (!cancelled) {
              setReviewsError(true);
              console.warn("[BusinessPage] Failed to load reviews:", error);
            }
            return [];
          }),
        ]);
        if (cancelled) return;
        setPosts(businessPosts);
        setReviews(businessReviews);
        setIsSaved(savedMerchantIds.includes(String(found.id)));
      } catch (error) {
        if (!cancelled) {
          setBusinessError(true);
          console.warn("[BusinessPage] Failed to load business:", error);
        }
      } finally {
        if (!cancelled) {
          setBusinessLoading(false);
          setPostsLoading(false);
        }
      }
    };

    void loadBusiness();
    return () => {
      cancelled = true;
    };
  }, [merchantId, user?.uid]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(shopper)/discover");
    }
  }, [router]);

  const handleToggleSave = async () => {
    if (!merchant || !user?.uid || saving) {
      if (!user?.uid) {
        Alert.alert("Sign In Required", "Please sign in to save this business.");
      }
      return;
    }

    const wasSaved = isSaved;
    const shouldBeSaved = !wasSaved;
    setIsSaved(shouldBeSaved);
    setSaving(true);
    try {
      const nextSaved = await toggleSaveMerchant(
        user.uid,
        merchant.id,
        wasSaved
      );
      if (nextSaved !== shouldBeSaved) {
        setIsSaved(wasSaved);
        Alert.alert("Unable to save", "Please try again.");
      }
    } catch (error) {
      setIsSaved(wasSaved);
      console.error("[BusinessPage] Failed to update saved business:", error);
      Alert.alert("Unable to save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDirections = async () => {
    if (!merchant) return;
    const opened = await openDirections(
      merchant.latitude,
      merchant.longitude,
      merchant.name,
      merchant.id,
      user?.uid
    );
    if (!opened) {
      Alert.alert("Location unavailable", "Directions are not available for this business.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BackArrowIcon size={20} color={Colors.teal[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {merchant?.name || "Business"}
          </Text>
        </View>

        {businessLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.teal[700]} />
            <Text style={styles.stateText}>Loading business...</Text>
          </View>
        ) : businessError || !merchant ? (
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>Business unavailable</Text>
            <Text style={styles.stateText}>
              This business could not be found. Please go back and try again.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
            >
              <BusinessProfile
                merchant={merchant}
                posts={posts}
                postsLoading={postsLoading}
                postsError={postsError}
                isSaved={isSaved}
                saving={saving}
                onToggleSave={() => void handleToggleSave()}
                onGetDirections={() => void handleDirections()}
                reviews={reviews}
                reviewsError={reviewsError}
              />
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.slate[50],
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
  },
  headerTitle: {
    flex: 1,
    color: Colors.slate[900],
    fontSize: 17,
    fontWeight: "700",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  stateTitle: {
    color: Colors.slate[800],
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: Colors.slate[500],
    fontSize: 13,
    textAlign: "center",
  },
});
