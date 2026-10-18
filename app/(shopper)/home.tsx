import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MapMerchant, MerchantPost, UserLocation } from "../../src/types";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  LocationIcon,
  ChevronDownIcon,
  StarIcon,
  CloseIcon,
  CheckIcon,
} from "../../src/components/icons/AppIcons";
import { HeroAdCarousel } from "../../src/components/common/HeroAdCarousel";
import { MerchantPhoto } from "../../src/components/common/MerchantPhoto";
import { MerchantSheet } from "../../src/components/common/MerchantSheet";
import { PostCard } from "../../src/components/PostCard";
import { LocationPicker } from "../../src/components/common/LocationPicker";
import { AddressPinState } from "../../src/hooks/useAddressPin";
import {
  fetchMerchants,
} from "../../src/services/firestoreService";
import { fetchMerchantPostsForCustomer } from "../../src/services/merchantCommunityService";
import { haversineDistanceKm, isMerchantOpenNow } from "../../src/services/geocodingService";
import { useAuthRole } from "../../src/context/AuthRoleContext";

interface HomeFeedPost {
  merchant: MapMerchant;
  post: MerchantPost;
}

const timestampMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string") {
    const milliseconds = new Date(value).getTime();
    return Number.isFinite(milliseconds) ? milliseconds : 0;
  }
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = value.toMillis;
    if (typeof toMillis === "function") {
      const milliseconds: unknown = toMillis.call(value);
      if (typeof milliseconds === "number") return milliseconds;
    }
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const date: unknown = toDate.call(value);
      if (date instanceof Date) return date.getTime();
    }
  }
  return 0;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthRole();
  const [activeFilter, setActiveFilter] = useState("Nearby");
  const [selectedMerchant, setSelectedMerchant] = useState<MapMerchant | null>(null);
  const [merchants, setMerchants] = useState<MapMerchant[]>([]);
  const [businessPosts, setBusinessPosts] = useState<HomeFeedPost[]>([]);
  const [businessPostsLoading, setBusinessPostsLoading] = useState(true);
  const [businessPostsError, setBusinessPostsError] = useState(false);
  const [showMoreBusinessPosts, setShowMoreBusinessPosts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [merchantsError, setMerchantsError] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    user?.location || null
  );
  // Working copy for the location picker modal
  const [pickerState, setPickerState] = useState<AddressPinState | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMerchantsError(false);
      setBusinessPostsLoading(true);
      setBusinessPostsError(false);
      try {
        const merchantsData = await fetchMerchants();
        setMerchants(merchantsData);
        const postResults = await Promise.allSettled(
          merchantsData.map(async (merchant) => ({
            merchant,
            posts: await fetchMerchantPostsForCustomer(String(merchant.id)),
          }))
        );
        const loadedPosts = postResults.flatMap((result) =>
          result.status === "fulfilled"
            ? result.value.posts.map((post) => ({
                merchant: result.value.merchant,
                post,
              }))
            : []
        );
        loadedPosts.sort(
          (a, b) =>
            timestampMillis(b.post.createdAt) -
            timestampMillis(a.post.createdAt)
        );
        setBusinessPosts(loadedPosts);
        setBusinessPostsError(
          postResults.some((result) => result.status === "rejected")
        );
      } catch (error) {
        console.error("[HomeScreen] Error loading data:", error);
        setMerchantsError(true);
        setBusinessPostsError(true);
      } finally {
        setBusinessPostsLoading(false);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filters = ["Nearby", "Open Now", "Budget", "Top Rated"];

  const getFilteredMerchants = () => {
    switch (activeFilter) {
      case "Nearby": {
        const refLat = userLocation?.lat ?? 37.7749;
        const refLng = userLocation?.lng ?? -122.4194;
        return [...merchants]
          .filter((m) => m.latitude != null && m.longitude != null)
          .sort((a, b) => {
            const distA = haversineDistanceKm(refLat, refLng, a.latitude!, a.longitude!);
            const distB = haversineDistanceKm(refLat, refLng, b.latitude!, b.longitude!);
            return distA - distB;
          });
      }
      case "Open Now":
        return merchants.filter((m) =>
          isMerchantOpenNow(m.weeklyHours, m.isOpen)
        );
      case "Budget":
        // No priceLevel field exists on merchant documents yet
        return [];
      case "Top Rated":
        return [...merchants].sort((a, b) => b.rating - a.rating);
      default:
        return merchants;
    }
  };

  const filteredMerchants = getFilteredMerchants();
  const shortLocation = userLocation?.label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  const handleOpenPicker = () => {
    setPickerState(
      userLocation
        ? { label: userLocation.label, lat: userLocation.lat, lng: userLocation.lng }
        : null
    );
    setLocationPickerVisible(true);
  };

  const handleConfirmLocation = async () => {
    if (!pickerState) return;
    const location: UserLocation = {
      label: pickerState.label,
      lat: pickerState.lat,
      lng: pickerState.lng,
    };
    setUserLocation(location);
    setLocationPickerVisible(false);
    try {
      await updateUser({ location });
      console.log("[HomeScreen] Location saved:", location.label, location.lat, location.lng);
    } catch (err) {
      console.warn("[HomeScreen] Failed to save location:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <TouchableOpacity
              style={styles.locationSelector}
              activeOpacity={0.7}
              onPress={handleOpenPicker}
            >
              <LocationIcon size={16} color={Colors.teal[700]} />
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {shortLocation || "Choose location"}
              </Text>
              <ChevronDownIcon size={14} color={Colors.slate[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarCircle}
              activeOpacity={0.7}
              onPress={() => router.push("/(shopper)/settings")}
            >
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{user?.initials || "U"}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Horizontal filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {filters.map((f) => {
              const isActive = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterPill,
                    isActive ? styles.filterPillActive : styles.filterPillInactive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive
                        ? styles.filterPillTextActive
                        : styles.filterPillTextInactive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Feed Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.feedContent,
            { paddingBottom: 20 + insets.bottom },
          ]}
        >
          <Text style={[styles.sectionHeader, styles.dealsHeading]}>
            Deals &amp; Promos
          </Text>
          <HeroAdCarousel
            merchants={merchants}
            onPressViewMore={(merchant) => {
              if (merchant) setSelectedMerchant(merchant);
            }}
          />

          {(businessPostsLoading ||
            businessPosts.length > 0 ||
            businessPostsError) && (
            <View style={styles.businessPostsSection}>
              <View style={styles.businessPostsHeader}>
                <View style={styles.businessPostsHeading}>
                  <Text style={styles.businessPostsTitle}>
                    Latest from businesses
                  </Text>
                  <Text style={styles.businessPostsSubtitle}>
                    Recent updates from local businesses
                  </Text>
                </View>
              </View>
              {businessPostsLoading ? (
                <ActivityIndicator color={Colors.teal[700]} />
              ) : businessPostsError && businessPosts.length === 0 ? (
                <Text style={styles.businessPostsEmpty}>
                  Business posts could not be loaded. Please try again later.
                </Text>
              ) : (
                <>
                  {businessPostsError && (
                    <Text style={styles.businessPostsError}>
                      Some business posts could not be loaded.
                    </Text>
                  )}
                  {businessPosts
                    .slice(0, showMoreBusinessPosts ? 15 : 5)
                    .map(({ merchant, post }) => (
                      <PostCard
                        key={`${merchant.id}-${post.id}`}
                        post={post}
                        businessName={merchant.name}
                        businessAvatarUrl={merchant.img}
                        style={styles.businessPostCard}
                        onPressBusiness={() => setSelectedMerchant(merchant)}
                      />
                    ))}
                  {businessPosts.length > 5 && (
                    <TouchableOpacity
                      style={styles.seeMorePostsButton}
                      onPress={() =>
                        setShowMoreBusinessPosts((expanded) => !expanded)
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.seeMorePostsText}>
                        {showMoreBusinessPosts ? "See less" : "See more"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* For You Section */}
          <View style={styles.forYouSection}>
            <Text style={styles.sectionHeader}>For You</Text>

            {loading ? (
              <ActivityIndicator color={Colors.teal[700]} />
            ) : merchantsError ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Businesses could not be loaded. Please try again later.
                </Text>
              </View>
            ) : filteredMerchants.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {!userLocation
                    ? "Choose a location to see nearby merchants"
                    : activeFilter === "Budget"
                    ? "No price data available yet"
                    : "No merchants found"}
                </Text>
              </View>
            ) : (
                filteredMerchants.map((m) => (
                  <View key={m.id} style={styles.feedItem}>
                    <TouchableOpacity
                      style={styles.merchantCard}
                      onPress={() => setSelectedMerchant(m)}
                      activeOpacity={0.88}
                    >
                      <MerchantPhoto uri={m.img} style={styles.merchantImage} />
                      <View style={styles.cardBody}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.merchantCardTitle} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              m.isOpen ? styles.openBadge : styles.closedBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                m.isOpen ? styles.openText : styles.closedText,
                              ]}
                            >
                              {m.isOpen ? "Open" : "Closed"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardMetaRow}>
                          <View style={styles.ratingRow}>
                            <StarIcon size={12} color={Colors.amber[500]} />
                            <Text style={styles.metaText}>
                            {m.rating > 0 ? m.rating : "—"}
                          </Text>
                          </View>
                          <Text style={styles.dotSeparator}>·</Text>
                          <Text style={styles.metaText}>{m.distance}</Text>
                          <Text style={styles.dotSeparator}>·</Text>
                          <Text style={styles.metaText}>{m.category}</Text>
                        </View>

                        {m.tag && (
                          <View style={styles.interestTagBox}>
                            <Text style={styles.interestTagText}>
                              Based on your interest: {m.tag}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                  </View>
                )))}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Merchant Details Bottom Sheet */}
        <MerchantSheet
          merchant={selectedMerchant}
          visible={!!selectedMerchant}
          onClose={() => setSelectedMerchant(null)}
        />

        {/* Location Picker Modal */}
        {locationPickerVisible && (
          <Modal
            visible={locationPickerVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setLocationPickerVisible(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity
                  onPress={() => setLocationPickerVisible(false)}
                  style={styles.pickerModalHeaderButton}
                >
                  <CloseIcon size={20} color={Colors.slate[600]} />
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Choose Location</Text>
                <TouchableOpacity
                  onPress={handleConfirmLocation}
                  style={styles.pickerModalHeaderButton}
                >
                  <CheckIcon size={20} color={Colors.teal[700]} />
                </TouchableOpacity>
              </View>
              <LocationPicker
                initial={pickerState}
                onChange={setPickerState}
                mapHeight={280}
              />
              <View
                style={[
                  styles.pickerModalFooter,
                  { paddingBottom: 16 + insets.bottom },
                ]}
              >
                <TouchableOpacity
                  style={styles.pickerConfirmButton}
                  onPress={handleConfirmLocation}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pickerConfirmButtonText}>Confirm Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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

  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: Colors.slate[500],
  },
  topBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[900],
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.teal[800],
  },
  filterPillsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  filterPillInactive: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate[200],
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  filterPillTextInactive: {
    color: Colors.slate[600],
  },
  feedContent: {
    paddingBottom: 20,
  },
  businessPostsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  businessPostsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  businessPostsHeading: {
    flex: 1,
    marginRight: 12,
  },
  businessPostsTitle: {
    color: Colors.slate[900],
    fontSize: 18,
    fontWeight: "700",
  },
  businessPostsSubtitle: {
    color: Colors.slate[500],
    fontSize: 12,
    marginTop: 3,
  },
  seeMorePostsButton: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
  },
  seeMorePostsText: {
    color: Colors.teal[700],
    fontSize: 13,
    fontWeight: "700",
  },
  businessPostsEmpty: {
    color: Colors.slate[500],
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 32,
  },
  businessPostsError: {
    color: Colors.rose[600],
    fontSize: 12,
  },
  businessPostCard: {
    marginBottom: 4,
  },
  forYouSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  dealsHeading: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: -4,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 12,
  },
  feedItem: {
    marginBottom: 12,
  },
  merchantCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  merchantImage: {
    width: "100%",
    height: 130,
    backgroundColor: Colors.slate[100],
  },
  cardBody: {
    padding: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  merchantCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
    flex: 1,
    paddingRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  openBadge: {
    backgroundColor: Colors.emerald[50],
  },
  closedBadge: {
    backgroundColor: Colors.slate[100],
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  openText: {
    color: Colors.emerald[700],
  },
  closedText: {
    color: Colors.slate[500],
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: Colors.slate[500],
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: Colors.slate[300],
    fontSize: 12,
  },
  interestTagBox: {
    backgroundColor: Colors.teal[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.md,
    alignSelf: "flex-start",
  },
  interestTagText: {
    color: Colors.teal[700],
    fontSize: 11,
    fontWeight: "600",
  },
  pickerModalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  pickerModalHeaderButton: {
    padding: 8,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  pickerModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate[100],
  },
  pickerConfirmButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  pickerConfirmButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
