import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Merchant } from "../../types";
import MerchantMap from "../MerchantMap";
// DAILY_HOURS import removed — using merchant.weeklyHours from Firestore instead
import { Colors, Radius, Shadows } from "../../constants/theme";
import {
  StarIcon,
  CheckIcon,
  CloseIcon,
  MegaphoneIcon,
  RightArrowIcon,
  BackArrowIcon,
} from "../icons/AppIcons";
import { openDirections } from "../../services/directionsService";
import { useAuthRole } from "../../context/AuthRoleContext";
import {
  fetchMerchantPosts,
  MerchantPost,
} from "../../services/firestoreService";

interface MerchantSheetProps {
  merchant: Merchant | null;
  visible: boolean;
  onClose: () => void;
  showHolidayBanner?: boolean;
}

const { height } = Dimensions.get("window");

export const MerchantSheet: React.FC<MerchantSheetProps> = ({
  merchant,
  visible,
  onClose,
  showHolidayBanner = false,
}) => {
  const { user } = useAuthRole();
  const [reported, setReported] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportOption, setReportOption] = useState("");
  const [posts, setPosts] = useState<MerchantPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showPostsView, setShowPostsView] = useState(false);

  useEffect(() => {
    if (merchant?.id && visible) {
      setPostsLoading(true);
      fetchMerchantPosts(String(merchant.id))
        .then((fetched) => setPosts(fetched))
        .catch((err) => console.warn("[MerchantSheet] fetchMerchantPosts error:", err))
        .finally(() => setPostsLoading(false));
    } else {
      setShowPostsView(false);
    }
  }, [merchant?.id, visible]);

  if (!merchant) return null;

  const lat = (merchant as any).lat ?? merchant.latitude;
  const lng = (merchant as any).lng ?? merchant.longitude;
  const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  const handleDirections = async () => {
    if (!hasCoords) return;
    await openDirections(lat, lng, merchant.name, merchant.id, user?.uid);
  };

  const handleClose = () => {
    setShowReport(false);
    setReported(false);
    setReportOption("");
    setShowPostsView(false);
    onClose();
  };

  const handleSubmitReport = () => {
    setReported(true);
    setShowReport(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheetContainer}>
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Close button in header */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CloseIcon size={20} color={Colors.slate[500]} />
          </TouchableOpacity>

          {showPostsView ? (
            /* ── POST FEED VIEW ── */
            <View style={styles.postsViewContainer}>
              <View style={styles.postsViewHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowPostsView(false)}
                  activeOpacity={0.7}
                >
                  <BackArrowIcon size={20} color={Colors.teal[700]} />
                  <Text style={styles.backButtonText}>Store Info</Text>
                </TouchableOpacity>
                <Text style={styles.postsViewTitle} numberOfLines={1}>
                  {merchant.name} Posts
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.postsScrollContent}
              >
                {postsLoading ? (
                  <View style={styles.postsLoadingContainer}>
                    <ActivityIndicator size="small" color={Colors.teal[700]} />
                    <Text style={styles.postsLoadingText}>Loading posts…</Text>
                  </View>
                ) : posts.length === 0 ? (
                  <View style={styles.emptyPostsBox}>
                    <Text style={styles.emptyPostsEmoji}>📢</Text>
                    <Text style={styles.emptyPostsTitle}>No updates yet</Text>
                    <Text style={styles.emptyPostsSub}>
                      This business hasn't shared any promotional posts or announcements yet. Check back soon!
                    </Text>
                  </View>
                ) : (
                  posts.map((post) => (
                    <View key={post.id} style={styles.sheetPostCard}>
                      {/* Post Images: multi-image or single image */}
                      {post.images && post.images.length > 1 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.multiImageScroll}
                        >
                          {post.images.map((imgUri, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: imgUri }}
                              style={styles.postCarouselImage}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      ) : post.image ? (
                        <Image
                          source={{ uri: post.image }}
                          style={styles.postSingleImage}
                          resizeMode="cover"
                        />
                      ) : null}

                      <View style={styles.sheetPostBody}>
                        <View style={styles.sheetPostMetaRow}>
                          <View style={styles.postTypeBadge}>
                            <Text style={styles.postTypeBadgeText}>
                              {post.type || "Promo"}
                            </Text>
                          </View>
                          {post.createdAt?.toDate && (
                            <Text style={styles.sheetPostDate}>
                              {post.createdAt.toDate().toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.sheetPostCaption}>{post.caption}</Text>
                      </View>
                    </View>
                  ))
                )}
                <View style={{ height: 32 }} />
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Cover image */}
              <Image
                source={{ uri: merchant.img }}
                style={styles.coverImage}
                resizeMode="cover"
              />

              {/* Title & Status */}
              <View style={styles.titleRow}>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                {merchant.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.statusBadge,
                    merchant.isOpen ? styles.openBadge : styles.closedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      merchant.isOpen ? styles.openText : styles.closedText,
                    ]}
                  >
                    {merchant.isOpen ? "Open Now" : "Closed"}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <StarIcon size={12} color={Colors.amber[500]} />
                  <Text style={styles.ratingText}>
                    {merchant.rating > 0
                      ? `${merchant.rating} (${merchant.reviews})`
                      : "No rating"}
                  </Text>
                </View>
                <Text style={styles.distanceText}>{merchant.distance}</Text>
              </View>

              {/* Business Post Feed Link Banner */}
              <TouchableOpacity
                style={styles.postsBanner}
                onPress={() => setShowPostsView(true)}
                activeOpacity={0.8}
              >
                <View style={styles.postsBannerLeft}>
                  <View style={styles.postsBannerIconWrap}>
                    <MegaphoneIcon size={18} color={Colors.teal[700]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.postsBannerTitle}>Store Updates & Posts</Text>
                      {posts.length > 0 && (
                        <View style={styles.postsCountBadge}>
                          <Text style={styles.postsCountText}>{posts.length}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postsBannerSub} numberOfLines={1}>
                      {posts.length > 0
                        ? posts[0].caption || `${posts.length} latest update available`
                        : "View announcements, specials & deals"}
                    </Text>
                  </View>
                </View>
                <RightArrowIcon size={16} color={Colors.teal[700]} />
              </TouchableOpacity>

              {/* Holiday Notice Banner */}
              {showHolidayBanner && (
                <View style={styles.holidayBanner}>
                  <Text style={styles.bannerEmoji}>🎃</Text>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>Upcoming Holiday Closure</Text>
                    <Text style={styles.bannerText}>
                      Closed Oct 31 – Nov 1 for Public Holiday. Regular hours resume Nov 2.
                    </Text>
                  </View>
                </View>
              )}

              {/* Verification Card */}
              {merchant.isOpen && (
                <View style={styles.verificationCard}>
                  <View style={styles.verificationRow}>
                    <CheckIcon size={16} color={Colors.teal[700]} />
                    <Text style={styles.verificationTitle}>
                      Verified by Owner Today
                    </Text>
                  </View>
                  <Text style={styles.verificationSub}>
                    Confirmed at 8:42 AM · Hours: {merchant.hours || "Not set"}
                  </Text>
                </View>
              )}

            {/* Store details card with daily hours */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Store Details</Text>
              <View style={styles.addressRow}>
                <Text style={styles.pinEmoji}>📍</Text>
                <Text style={styles.addressText}>{merchant.address || "Address not available"}</Text>
              </View>

              <View style={styles.hoursList}>
                {merchant.weeklyHours ? (
                  Object.entries(merchant.weeklyHours).map(([day, hours]) => (
                    <View key={day} style={styles.hourRow}>
                      <Text style={styles.dayText}>{day}</Text>
                      <Text
                        style={[
                          styles.timeText,
                          (hours as any).isClosed && styles.closedTimeText,
                        ]}
                      >
                        {(hours as any).isClosed
                          ? "Closed"
                          : `${(hours as any).openTime} – ${(hours as any).closeTime}`}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noHoursText}>Hours not available</Text>
                )}
              </View>
            </View>

            {/* Location mini-map */}
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.mapContainer}>
                <MerchantMap
                  style={styles.miniMap}
                  initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  markers={[
                    {
                      id: `sheet-pin-${merchant.id}`,
                      coordinate: { latitude: lat, longitude: lng },
                      pinColor: Colors.teal[700],
                      pinSize: 32,
                      children: (
                        <View style={styles.mapPin}>
                          <View style={styles.mapPinInner} />
                        </View>
                      ),
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.directionsButton,
                    !hasCoords && styles.directionsButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleDirections}
                  disabled={!hasCoords}
                >
                  <Text style={styles.directionsText}>
                    {hasCoords ? "Get Directions" : "No location"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Report link and form */}
            {!showReport ? (
              <TouchableOpacity
                onPress={() => setShowReport(true)}
                style={styles.reportTrigger}
              >
                <Text style={styles.reportTriggerText}>Report incorrect info</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reportForm}>
                <Text style={styles.reportHeader}>What's wrong?</Text>
                {["Closed permanently", "Wrong hours", "Moved address"].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setReportOption(opt)}
                    style={styles.reportOptionRow}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        reportOption === opt && styles.radioCircleSelected,
                      ]}
                    >
                      {reportOption === opt && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.reportOptionLabel}>{opt}</Text>
                  </TouchableOpacity>
                ))}

                {reportOption !== "" && (
                  <TouchableOpacity
                    onPress={handleSubmitReport}
                    style={styles.submitReportButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitReportText}>Submit Report</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {reported && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>
                  Report submitted — thanks for keeping info accurate!
                </Text>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius["3xl"],
    borderTopRightRadius: Radius["3xl"],
    maxHeight: height * 0.9,
    position: "relative",
    ...Shadows.xl,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: "center",
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: Colors.slate[200],
    borderRadius: Radius.full,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 18,
    zIndex: 10,
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: Radius["2xl"],
    backgroundColor: Colors.slate[100],
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.slate[900],
    flex: 1,
    paddingRight: 8,
  },
  newBadge: {
    backgroundColor: Colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  newBadgeText: {
    color: Colors.emerald[700],
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  openBadge: {
    backgroundColor: Colors.emerald[50],
  },
  closedBadge: {
    backgroundColor: Colors.slate[100],
  },
  statusText: {
    fontSize: 12,
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
    fontSize: 12,
    color: Colors.slate[500],
  },
  distanceText: {
    fontSize: 12,
    color: Colors.slate[500],
  },
  holidayBanner: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    borderRadius: Radius.xl,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  bannerEmoji: {
    fontSize: 16,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.amber[900],
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: Colors.amber[800],
    lineHeight: 16,
  },
  verificationCard: {
    backgroundColor: "rgba(238, 242, 255, 0.6)",
    borderWidth: 1,
    borderColor: Colors.teal[100],
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 16,
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.teal[800],
  },
  verificationSub: {
    fontSize: 11,
    color: Colors.teal[600],
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.slate[600],
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  pinEmoji: {
    fontSize: 14,
  },
  addressText: {
    fontSize: 13,
    color: Colors.slate[700],
    flex: 1,
  },
  hoursList: {
    gap: 6,
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayText: {
    fontSize: 12,
    color: Colors.slate[500],
    width: 36,
  },
  timeText: {
    fontSize: 12,
    color: Colors.slate[700],
  },
  closedTimeText: {
    color: Colors.slate[400],
    fontStyle: "italic",
  },
  noHoursText: {
    fontSize: 12,
    color: Colors.slate[400],
    fontStyle: "italic",
  },
  mapSection: {
    marginBottom: 16,
  },
  mapContainer: {
    width: "100%",
    height: 140,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.slate[200],
    position: "relative",
  },
  miniMap: {
    ...StyleSheet.absoluteFill,
  },
  mapPin: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  mapPinInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
  },
  directionsButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  directionsButtonDisabled: {
    backgroundColor: Colors.slate[300],
  },
  directionsText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  reportTrigger: {
    paddingVertical: 6,
  },
  reportTriggerText: {
    fontSize: 13,
    color: Colors.slate[400],
    textDecorationLine: "underline",
  },
  reportForm: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    padding: 16,
    marginTop: 8,
  },
  reportHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
    marginBottom: 10,
  },
  reportOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Colors.teal[700],
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
  },
  reportOptionLabel: {
    fontSize: 13,
    color: Colors.slate[700],
  },
  submitReportButton: {
    marginTop: 12,
    backgroundColor: Colors.amber[500],
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  submitReportText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  successBanner: {
    marginTop: 12,
    backgroundColor: Colors.slate[900],
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  successText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  postsBanner: {
    backgroundColor: Colors.teal[50],
    borderWidth: 1,
    borderColor: Colors.teal[200],
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    ...Shadows.sm,
  },
  postsBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  postsBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  postsBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.teal[900],
  },
  postsCountBadge: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  postsCountText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  postsBannerSub: {
    fontSize: 12,
    color: Colors.teal[700],
    marginTop: 2,
  },
  postsViewContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  postsViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    marginBottom: 14,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.teal[50],
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  postsViewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[800],
    flex: 1,
  },
  postsScrollContent: {
    paddingBottom: 24,
    gap: 14,
  },
  postsLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  postsLoadingText: {
    fontSize: 13,
    color: Colors.slate[500],
  },
  emptyPostsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    gap: 8,
  },
  emptyPostsEmoji: {
    fontSize: 32,
  },
  emptyPostsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  emptyPostsSub: {
    fontSize: 13,
    color: Colors.slate[500],
    textAlign: "center",
    lineHeight: 18,
  },
  sheetPostCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  multiImageScroll: {
    padding: 8,
    gap: 8,
  },
  postCarouselImage: {
    width: 220,
    height: 150,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
    marginRight: 8,
  },
  postSingleImage: {
    width: "100%",
    height: 180,
    backgroundColor: Colors.slate[100],
  },
  sheetPostBody: {
    padding: 12,
  },
  sheetPostMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  postTypeBadge: {
    backgroundColor: Colors.teal[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  postTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.teal[700],
    textTransform: "capitalize",
  },
  sheetPostDate: {
    fontSize: 11,
    color: Colors.slate[400],
  },
  sheetPostCaption: {
    fontSize: 13,
    color: Colors.slate[800],
    lineHeight: 18,
  },
});
