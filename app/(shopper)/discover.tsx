import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
// Loading state tracked via console.log only — no visual loading indicators
import MerchantMap, {
  MerchantMapHandle,
} from "../../src/components/MerchantMap";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapMerchant, Merchant } from "../../src/types";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  SearchIcon,
  CloseIcon,
  FilterIcon,
  ListViewIcon,
  MapViewIcon,
  StarIcon,
  RecenterIcon,
} from "../../src/components/icons/AppIcons";
import { CustomMarker } from "../../src/components/map/CustomMarker";
import { MerchantSheet } from "../../src/components/common/MerchantSheet";
import { FilterSheet } from "../../src/components/common/FilterSheet";
import { fetchMerchants, fetchCategories } from "../../src/services/firestoreService";
import { openDirections } from "../../src/services/directionsService";
import { useAuthRole } from "../../src/context/AuthRoleContext";

const { width } = Dimensions.get("window");
const DEFAULT_CENTER = {
  latitude: 37.7752,
  longitude: -122.4196,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

/**
 * Mirrors `CustomMarker`'s native background colors so the web `divIcon` pin
 * matches the native marker for each merchant type.
 */
const PIN_COLOR: Record<MapMerchant["type"], string> = {
  standard: Colors.teal[700],
  new: Colors.emerald[500],
  sponsored: Colors.amber[500],
};

export default function DiscoverScreen() {
  const { user } = useAuthRole();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "verified" | "sponsored">("");
  const [activeMarker, setActiveMarker] = useState<MapMerchant | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [distanceKm, setDistanceKm] = useState(5);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [merchants, setMerchants] = useState<MapMerchant[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<MerchantMapHandle | null>(null);
  const carouselRef = useRef<FlatList>(null);

  const STATUS_TOGGLES = [
    { id: "open", label: "Open Now" },
    { id: "verified", label: "Verified Today" },
    { id: "sponsored", label: "Sponsored" },
  ] as const;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [merchantsData, categoriesData] = await Promise.all([
          fetchMerchants(),
          fetchCategories(),
        ]);
        console.log("[DiscoverScreen] Fetched merchants:", merchantsData.length, "categories:", categoriesData.length);
        setMerchants(merchantsData);
        setCategories(categoriesData.length > 0 ? ["All", ...categoriesData] : ["All"]);
      } catch (error) {
        console.error("[DiscoverScreen] Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = merchants.filter((m) => {
    const matchCat = activeCategory === "All" || m.category === activeCategory;
    const matchQ =
      query === "" ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase());
    const matchStatus =
      statusFilter === "" ||
      (statusFilter === "open" && m.isOpen) ||
      (statusFilter === "sponsored" && m.type === "sponsored") ||
      (statusFilter === "verified" && m.isOpen);
    const matchFilterSheetOpen = !filterOpenNow || m.isOpen;
    return matchCat && matchQ && matchStatus && matchFilterSheetOpen;
  });

  const handleRecenter = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          800
        );
        return;
      }
    } catch {
      // fallback to default SF
    }

    mapRef.current?.animateToRegion(DEFAULT_CENTER, 800);
  };

  const handleSelectMarker = (m: MapMerchant) => {
    setActiveMarker(m);
    mapRef.current?.animateToRegion(
      {
        latitude: m.lat,
        longitude: m.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      600
    );
    const idx = filtered.findIndex((item) => item.id === m.id);
    if (idx !== -1) {
      carouselRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  };

  const isFilterActive = filterOpenNow || filterVerified || distanceKm !== 5;

  console.log("[DiscoverScreen] loading:", loading, "merchants:", merchants.length, "filtered:", filtered.length);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Sticky Header */}
        <View style={styles.header}>
          {/* Search bar + filter button row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <SearchIcon size={16} color={Colors.slate[400]} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search businesses near you…"
                placeholderTextColor={Colors.slate[400]}
              />
              {query !== "" && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <CloseIcon size={16} color={Colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilterSheet(true)}
              style={[
                styles.filterButton,
                isFilterActive
                  ? styles.filterButtonActive
                  : styles.filterButtonInactive,
              ]}
              activeOpacity={0.8}
            >
              <FilterIcon
                size={18}
                color={isFilterActive ? Colors.white : Colors.slate[600]}
              />
            </TouchableOpacity>
          </View>

          {/* Segmented List/Map Toggle */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[
                styles.segmentTab,
                viewMode === "list" && styles.segmentTabActive,
              ]}
              activeOpacity={0.8}
            >
              <ListViewIcon
                size={14}
                color={viewMode === "list" ? Colors.white : Colors.slate[600]}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  viewMode === "list" && styles.segmentTabTextActive,
                ]}
              >
                List View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("map")}
              style={[
                styles.segmentTab,
                viewMode === "map" && styles.segmentTabActive,
              ]}
              activeOpacity={0.8}
            >
              <MapViewIcon
                size={14}
                color={viewMode === "map" ? Colors.white : Colors.slate[600]}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  viewMode === "map" && styles.segmentTabTextActive,
                ]}
              >
                Map View
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Category + Status Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : styles.chipTextInactive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.chipDivider} />

            {STATUS_TOGGLES.map((t) => {
              const active = statusFilter === t.id;
              const isSponsored = t.id === "sponsored";
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() =>
                    setStatusFilter((prev) => (prev === t.id ? "" : t.id))
                  }
                  style={[
                    styles.chip,
                    active
                      ? isSponsored
                        ? styles.chipActiveAmber
                        : styles.chipActiveEmerald
                      : styles.chipInactive,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : styles.chipTextInactive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── LIST VIEW ── */}
        {viewMode === "list" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          >
            {(() => { console.log("[DiscoverScreen] RENDERING merchants:", filtered.map((m) => m.name)); return null; })()}
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No results found</Text>
                <TouchableOpacity
                  onPress={() => {
                    setQuery("");
                    setActiveCategory("All");
                    setStatusFilter("");
                    setFilterOpenNow(false);
                    setFilterVerified(false);
                  }}
                  style={styles.clearFiltersButton}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.listItemCard}
                  onPress={() => setSelectedMerchant(m)}
                  activeOpacity={0.88}
                >
                  {/* Top row */}
                  <View style={styles.cardHeaderRow}>
                    <Image
                      source={{ uri: m.img }}
                      style={styles.cardAvatar}
                      resizeMode="cover"
                    />
                    <View style={styles.cardHeaderContent}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {m.name}
                        </Text>
                        {m.type === "sponsored" && (
                          <View style={styles.sponsoredBadge}>
                            <Text style={styles.sponsoredBadgeText}>
                              Sponsored
                            </Text>
                          </View>
                        )}
                        {m.type === "new" && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>New</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.categoryDistanceText}>
                        {m.category} · {m.distance}
                      </Text>

                      <View style={styles.statusRatingRow}>
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
                        <View style={styles.ratingBadge}>
                          <StarIcon size={12} color={Colors.amber[500]} />
                          <Text style={styles.ratingText}>{m.rating}</Text>
                        </View>
                        <Text style={styles.dotSeparator}>·</Text>
                        <Text style={styles.hoursText}>{m.hours}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Inline Static Map Snapshot */}
                  <View style={styles.inlineMapContainer}>
                    <MerchantMap
                      style={styles.inlineMap}
                      initialRegion={{
                        latitude: m.lat,
                        longitude: m.lng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      markers={[
                        {
                          id: `inline-${m.id}`,
                          coordinate: { latitude: m.lat, longitude: m.lng },
                          pinColor: PIN_COLOR[m.type],
                          pinSize: 32,
                          children: <CustomMarker type={m.type} active />,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      style={[
                        styles.directionsOverlayButton,
                        (m.lat == null || m.lng == null) &&
                          styles.directionsOverlayButtonDisabled,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        openDirections(m.lat, m.lng, m.name, m.id, user?.uid)
                      }
                      disabled={m.lat == null || m.lng == null}
                    >
                      <Text style={styles.directionsOverlayText}>
                        {m.lat != null && m.lng != null
                          ? "Directions"
                          : "No location"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        ) : (
          /* ── MAP VIEW ── */
          <View style={styles.mapContainer}>
            <MerchantMap
              ref={mapRef}
              style={styles.fullMap}
              initialRegion={DEFAULT_CENTER}
              markers={filtered.map((m) => ({
                id: m.id,
                coordinate: { latitude: m.lat, longitude: m.lng },
                onPress: () => handleSelectMarker(m),
                pinColor: PIN_COLOR[m.type],
                pinSize: activeMarker?.id === m.id ? 40 : 32,
                active: activeMarker?.id === m.id,
                children: (
                  <CustomMarker
                    type={m.type}
                    active={activeMarker?.id === m.id}
                  />
                ),
              }))}
            />

            {/* Recenter Button */}
            <TouchableOpacity
              onPress={handleRecenter}
              style={styles.recenterButton}
              activeOpacity={0.85}
            >
              <RecenterIcon size={24} color={Colors.white} />
            </TouchableOpacity>

            {/* Bottom Swipeable Merchant Carousel */}
            <View style={styles.mapBottomCarouselContainer}>
              <FlatList
                ref={carouselRef}
                data={filtered}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.carouselContent}
                snapToInterval={296}
                decelerationRate="fast"
                renderItem={({ item }) => {
                  const isActive = activeMarker?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.carouselCard,
                        isActive && styles.carouselCardActive,
                      ]}
                      onPress={() => {
                        setActiveMarker(item);
                        setSelectedMerchant(item);
                      }}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: item.img }}
                        style={styles.carouselCardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.carouselCardBody}>
                        <Text style={styles.carouselCardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.carouselCardSubtitle}>
                          {item.category} · {item.distance}
                        </Text>
                        <View style={styles.carouselCardMeta}>
                          <Text
                            style={[
                              styles.carouselStatusText,
                              item.isOpen
                                ? styles.carouselOpenText
                                : styles.carouselClosedText,
                            ]}
                          >
                            {item.isOpen ? "Open" : "Closed"}
                          </Text>
                          <View style={styles.ratingBadge}>
                            <StarIcon size={12} color={Colors.amber[500]} />
                            <Text style={styles.ratingText}>{item.rating}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.goButton}
                        onPress={() => setSelectedMerchant(item)}
                      >
                        <Text style={styles.goButtonText}>Go</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        )}

        {/* Merchant Details Bottom Sheet */}
        <MerchantSheet
          merchant={selectedMerchant}
          visible={!!selectedMerchant}
          onClose={() => setSelectedMerchant(null)}
        />

        {/* Filter Sheet Modal */}
        <FilterSheet
          visible={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          filterOpenNow={filterOpenNow}
          onToggleOpenNow={() => setFilterOpenNow((v) => !v)}
          filterVerified={filterVerified}
          onToggleVerified={() => setFilterVerified((v) => !v)}
          distanceKm={distanceKm}
          onChangeDistance={(km) => setDistanceKm(km)}
          onReset={() => {
            setDistanceKm(5);
            setFilterOpenNow(false);
            setFilterVerified(false);
            setActiveCategory("All");
          }}
          categories={categories}
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
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    gap: 8,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate[800],
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.teal[700],
  },
  filterButtonInactive: {
    backgroundColor: Colors.slate[100],
  },
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  segmentTabActive: {
    backgroundColor: Colors.teal[700],
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  segmentTabTextActive: {
    color: Colors.white,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  chipActiveAmber: {
    backgroundColor: Colors.amber[500],
    borderColor: Colors.amber[500],
  },
  chipActiveEmerald: {
    backgroundColor: Colors.emerald[600],
    borderColor: Colors.emerald[600],
  },
  chipInactive: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate[200],
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  chipTextInactive: {
    color: Colors.slate[600],
  },
  chipDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.slate[200],
    marginHorizontal: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
    marginBottom: 4,
  },
  clearFiltersButton: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  clearFiltersText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  listItemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 16,
    ...Shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.slate[100],
  },
  cardHeaderContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
    flex: 1,
  },
  sponsoredBadge: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    marginLeft: 6,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    color: Colors.amber[800],
    fontWeight: "600",
  },
  newBadge: {
    backgroundColor: Colors.emerald[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    marginLeft: 6,
  },
  newBadgeText: {
    fontSize: 10,
    color: Colors.emerald[700],
    fontWeight: "600",
  },
  categoryDistanceText: {
    fontSize: 12,
    color: Colors.slate[500],
    marginBottom: 6,
  },
  statusRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.slate[500],
  },
  dotSeparator: {
    color: Colors.slate[300],
    fontSize: 11,
  },
  hoursText: {
    fontSize: 11,
    color: Colors.slate[500],
  },
  inlineMapContainer: {
    width: "100%",
    height: 100,
    borderRadius: Radius.lg,
    marginTop: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.slate[100],
    position: "relative",
  },
  inlineMap: {
    ...StyleSheet.absoluteFill,
  },
  directionsOverlayButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  directionsOverlayButtonDisabled: {
    backgroundColor: Colors.slate[300],
  },
  directionsOverlayText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  fullMap: {
    ...StyleSheet.absoluteFill,
  },
  recenterButton: {
    position: "absolute",
    bottom: 110,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
    zIndex: 10,
  },
  mapBottomCarouselContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselCard: {
    width: 284,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Shadows.xl,
  },
  carouselCardActive: {
    borderColor: Colors.teal[600],
    borderWidth: 1.5,
  },
  carouselCardImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
  },
  carouselCardBody: {
    flex: 1,
  },
  carouselCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 2,
  },
  carouselCardSubtitle: {
    fontSize: 11,
    color: Colors.slate[500],
    marginBottom: 4,
  },
  carouselCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  carouselStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  carouselOpenText: {
    color: Colors.emerald[600],
  },
  carouselClosedText: {
    color: Colors.slate[400],
  },
  goButton: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  goButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
