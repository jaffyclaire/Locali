import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MerchantPost, MapMerchant } from "../../../src/types";
import { Colors, Radius, Shadows } from "../../../src/constants/theme";
import {
  BackArrowIcon,
  LocationIcon,
  StarIcon,
} from "../../../src/components/icons/AppIcons";
import { MerchantPhoto } from "../../../src/components/common/MerchantPhoto";
import { PostCard } from "../../../src/components/PostCard";
import { fetchMerchants } from "../../../src/services/firestoreService";
import { fetchMerchantPostsForCustomer } from "../../../src/services/merchantCommunityService";

export default function BusinessPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { merchantId: merchantIdParam } = useLocalSearchParams<{
    merchantId?: string | string[];
  }>();
  const merchantId = Array.isArray(merchantIdParam)
    ? merchantIdParam[0]
    : merchantIdParam;
  const [merchant, setMerchant] = useState<MapMerchant | null>(null);
  const [posts, setPosts] = useState<MerchantPost[]>([]);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadBusinessPage = async () => {
      try {
        const businesses = await fetchMerchants();
        const found = businesses.find(
          (business) => String(business.id) === merchantId
        );
        if (cancelled) return;
        if (!found) {
          setBusinessError(true);
          setPostsLoading(false);
          return;
        }
        setMerchant(found);
        setBusinessLoading(false);

        try {
          const businessPosts = await fetchMerchantPostsForCustomer(
            String(found.id)
          );
          if (!cancelled) setPosts(businessPosts);
        } catch (error) {
          if (!cancelled) {
            setPostsError(true);
            console.warn("[BusinessPage] Failed to load business posts:", error);
          }
        } finally {
          if (!cancelled) setPostsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setBusinessError(true);
          setBusinessLoading(false);
          setPostsLoading(false);
          console.warn("[BusinessPage] Failed to load business:", error);
        }
      }
    };

    loadBusinessPage();
    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
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
              This business could not be loaded. Please go back and try again.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 24 + insets.bottom },
            ]}
          >
            <MerchantPhoto uri={merchant.coverPhotoUrl || merchant.img} style={styles.cover} />
            <View style={styles.profileCard}>
              <View style={styles.businessAvatar}>
                {merchant.img ? (
                  <Image
                    source={{ uri: merchant.img }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {merchant.name.trim().slice(0, 1).toUpperCase() || "B"}
                  </Text>
                )}
              </View>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{merchant.name}</Text>
                <Text style={styles.category}>{merchant.category || "Local business"}</Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <StarIcon size={17} color={Colors.amber[500]} />
                <Text style={styles.detailText}>
                  {merchant.rating > 0
                    ? `${merchant.rating.toFixed(1)} · ${merchant.reviews} reviews`
                    : "No reviews yet"}
                </Text>
              </View>
              {!!merchant.address && (
                <View style={styles.detailRow}>
                  <LocationIcon size={17} color={Colors.teal[700]} />
                  <Text style={styles.detailText}>{merchant.address}</Text>
                </View>
              )}
              {!!merchant.description && (
                <Text style={styles.description}>{merchant.description}</Text>
              )}
            </View>

            <View style={styles.postsHeading}>
              <Text style={styles.postsTitle}>Posts</Text>
              <Text style={styles.postsSubtitle}>Updates from this business</Text>
            </View>

            {postsLoading ? (
              <View style={styles.postsState}>
                <ActivityIndicator color={Colors.teal[700]} />
                <Text style={styles.stateText}>Loading posts...</Text>
              </View>
            ) : postsError ? (
              <Text style={styles.postsEmpty}>
                Posts could not be loaded. Please try again later.
              </Text>
            ) : posts.length === 0 ? (
              <Text style={styles.postsEmpty}>
                This business hasn’t shared any posts yet.
              </Text>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  businessName={merchant.name}
                  businessAvatarUrl={merchant.img}
                  style={styles.postCard}
                />
              ))
            )}
          </ScrollView>
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
  scrollContent: {
    paddingBottom: 24,
  },
  cover: {
    width: "100%",
    height: 190,
    backgroundColor: Colors.slate[200],
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  businessAvatar: {
    width: 62,
    height: 62,
    overflow: "hidden",
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.teal[100],
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.sm,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: Colors.teal[800],
    fontSize: 24,
    fontWeight: "700",
  },
  businessInfo: {
    flex: 1,
    marginLeft: 14,
  },
  businessName: {
    color: Colors.slate[900],
    fontSize: 19,
    fontWeight: "700",
  },
  category: {
    color: Colors.slate[500],
    fontSize: 13,
    marginTop: 3,
  },
  detailsCard: {
    margin: 16,
    padding: 16,
    gap: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  detailText: {
    flex: 1,
    color: Colors.slate[700],
    fontSize: 13,
    lineHeight: 19,
  },
  description: {
    color: Colors.slate[600],
    fontSize: 13,
    lineHeight: 19,
  },
  postsHeading: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
  },
  postsTitle: {
    color: Colors.slate[900],
    fontSize: 18,
    fontWeight: "700",
  },
  postsSubtitle: {
    color: Colors.slate[500],
    fontSize: 12,
    marginTop: 3,
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  postsState: {
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postsEmpty: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    color: Colors.slate[500],
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
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
