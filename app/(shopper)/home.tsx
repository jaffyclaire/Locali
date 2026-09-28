import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapMerchant, SponsoredCardItem, UserLocation } from "../../src/types";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  LocationIcon,
  ChevronDownIcon,
  StarIcon,
} from "../../src/components/icons/AppIcons";
import { HeroAdCarousel } from "../../src/components/common/HeroAdCarousel";
import { SponsoredCard } from "../../src/components/common/SponsoredCard";
import { MerchantSheet } from "../../src/components/common/MerchantSheet";
import { LocationPickerModal } from "../../src/components/common/LocationPickerModal";
import { fetchMerchants, fetchSponsoredCards } from "../../src/services/firestoreService";
import { useAuthRole } from "../../src/context/AuthRoleContext";

export default function HomeScreen() {
  const { user, updateUser } = useAuthRole();
  const [activeFilter, setActiveFilter] = useState("Nearby");
  const [selectedMerchant, setSelectedMerchant] = useState<MapMerchant | null>(null);
  const [merchants, setMerchants] = useState<MapMerchant[]>([]);
  const [sponsoredCards, setSponsoredCards] = useState<SponsoredCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    user?.location || null
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [merchantsData, sponsoredData] = await Promise.all([
          fetchMerchants(),
          fetchSponsoredCards(),
        ]);
        setMerchants(merchantsData);
        setSponsoredCards(sponsoredData);
      } catch (error) {
        console.error("[HomeScreen] Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filters = ["Nearby", "Open Now", "Budget", "Top Rated"];
  const filteredMerchants =
    activeFilter === "Open Now"
      ? merchants.filter((m) => m.isOpen)
      : activeFilter === "Top Rated"
      ? [...merchants].sort((a, b) => b.rating - a.rating)
      : merchants;

  const handleSaveLocation = async (location: UserLocation) => {
    setUserLocation(location);
    setLocationPickerVisible(false);
    try {
      await updateUser({ location });
      console.log("[HomeScreen] Location saved:", location.label, location.lat, location.lng);
    } catch (err) {
      console.warn("[HomeScreen] Failed to save location:", err);
    }
  };

  console.log("[HomeScreen] loading:", loading, "merchants:", merchants.length, "sponsoredCards:", sponsoredCards.length);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarRow}>
            <TouchableOpacity
              style={styles.locationSelector}
              activeOpacity={0.7}
              onPress={() => setLocationPickerVisible(true)}
            >
              <LocationIcon size={16} color={Colors.teal[700]} />
              <Text style={styles.locationText}>
                {userLocation?.label || "Choose location"}
              </Text>
              <ChevronDownIcon size={14} color={Colors.slate[400]} />
            </TouchableOpacity>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
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
          contentContainerStyle={styles.feedContent}
        >
          {/* Hero Ad Carousel */}
          <HeroAdCarousel />

          {/* For You Section */}
          <View style={styles.forYouSection}>
            <Text style={styles.sectionHeader}>For You</Text>

            {(() => { console.log("[HomeScreen] RENDERING merchants:", filteredMerchants.map((m) => m.name)); return null; })()}
            {filteredMerchants.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No merchants found</Text>
              </View>
            ) : (
              <>
                {/* Injected first sponsored card */}
                {sponsoredCards.length > 0 && (
                  <View style={styles.feedItem}>
                    <SponsoredCard
                      card={sponsoredCards[0]}
                      onPress={() =>
                        setSelectedMerchant({
                          ...sponsoredCards[0],
                          lat: 37.7749,
                          lng: -122.4194,
                          latitude: 37.7749,
                          longitude: -122.4194,
                          type: "sponsored" as const,
                          hours: (sponsoredCards[0] as any).hours || "11:00 AM – 10:00 PM",
                          address: (sponsoredCards[0] as any).address || "55 Noodle St, Downtown SF",
                        } as unknown as MapMerchant)
                      }
                    />
                  </View>
                )}

                {/* Merchant cards */}
                {filteredMerchants.map((m, idx) => (
                  <View key={m.id} style={styles.feedItem}>
                    <TouchableOpacity
                      style={styles.merchantCard}
                      onPress={() => setSelectedMerchant(m)}
                      activeOpacity={0.88}
                    >
                      <Image
                        source={{ uri: m.img }}
                        style={styles.merchantImage}
                        resizeMode="cover"
                      />
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
                            <Text style={styles.metaText}>{m.rating}</Text>
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

                    {/* Injected second sponsored card after index 1 */}
                    {idx === 1 && sponsoredCards.length > 1 && (
                      <View style={styles.injectedSponsoredWrapper}>
                        <SponsoredCard
                          card={sponsoredCards[1]}
                          onPress={() =>
                            setSelectedMerchant({
                              ...sponsoredCards[1],
                              lat: 37.7749,
                              lng: -122.4194,
                              latitude: 37.7749,
                              longitude: -122.4194,
                              type: "sponsored" as const,
                              hours: (sponsoredCards[1] as any).hours || "7:00 AM – 6:00 PM",
                              address: (sponsoredCards[1] as any).address || "9 Flour Ave, Downtown SF",
                            } as unknown as MapMerchant)
                          }
                        />
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
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
        <LocationPickerModal
          visible={locationPickerVisible}
          initialLocation={userLocation}
          onSave={handleSaveLocation}
          onClose={() => setLocationPickerVisible(false)}
        />
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
  },
  locationText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
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
  forYouSection: {
    paddingHorizontal: 16,
    marginTop: 20,
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
  injectedSponsoredWrapper: {
    marginTop: 12,
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
});
