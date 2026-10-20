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
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Merchant } from "../../types";
import MerchantMap from "../MerchantMap";
import { MerchantPhoto } from "./MerchantPhoto";
// DAILY_HOURS import removed — using merchant.weeklyHours from Firestore instead
import { Colors, Radius, Shadows } from "../../constants/theme";
import {
  StarIcon,
  CheckIcon,
  CloseIcon,
  RightArrowIcon,
  BookmarkIcon,
  CalendarIcon,
  LocationIcon,
} from "../icons/AppIcons";
import { openDirections } from "../../services/directionsService";
import { useAuthRole } from "../../context/AuthRoleContext";
import {
  submitMerchantReview,
  fetchUserMerchantReview,
  getSavedMerchantIds,
  toggleSaveMerchant,
} from "../../services/firestoreService";
import {
  fetchMerchantReviews,
  MerchantReviewWithProfile,
  createMerchantCustomerActivity,
  saveMerchantReviewProfile,
} from "../../services/merchantCommunityService";

interface MerchantSheetProps {
  merchant: Merchant | null;
  visible: boolean;
  onClose: () => void;
  showHolidayBanner?: boolean;
}

const { height } = Dimensions.get("window");

const reviewDateLabel = (value: unknown): string => {
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const result: unknown = toDate.call(value);
      if (result instanceof Date) date = result;
    }
  } else if (typeof value === "string" || typeof value === "number") {
    const result = new Date(value);
    if (!Number.isNaN(result.getTime())) date = result;
  }
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";
};

export const MerchantSheet: React.FC<MerchantSheetProps> = ({
  merchant,
  visible,
  onClose,
  showHolidayBanner = false,
}) => {
  const router = useRouter();
  const { user } = useAuthRole();
  const insets = useSafeAreaInsets();
  const [reported, setReported] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportOption, setReportOption] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [reviews, setReviews] = useState<MerchantReviewWithProfile[]>([]);
  const [reviewsLoadedForId, setReviewsLoadedForId] = useState("");
  const [reviewsError, setReviewsError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const reviewsLoading =
    visible && !!merchant?.id && reviewsLoadedForId !== String(merchant.id);
  const ratedReviews = reviews.filter(
    (review) => review.rating >= 1 && review.rating <= 5
  );
  const reviewAverage =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) /
        ratedReviews.length
      : merchant?.rating || 0;

  useEffect(() => {
    if (!merchant?.id || !visible) return;
    const merchantId = String(merchant.id);
    let cancelled = false;
    fetchMerchantReviews(merchantId)
      .then((latestReviews) => {
        if (cancelled) return;
        setReviews(latestReviews);
        setReviewsLoadedForId(merchantId);
        setReviewsError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setReviewsLoadedForId(merchantId);
        setReviewsError(true);
        console.warn("[MerchantSheet] Failed to load reviews:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [merchant?.id, visible]);

  const refreshReviews = async () => {
    if (!merchant?.id) return;
    const merchantId = String(merchant.id);
    setReviewsLoadedForId("");
    setReviewsError(false);
    try {
      const latestReviews = await fetchMerchantReviews(merchantId);
      setReviews(latestReviews);
      setReviewsLoadedForId(merchantId);
    } catch (error) {
      setReviewsLoadedForId(merchantId);
      setReviewsError(true);
      console.warn("[MerchantSheet] Failed to refresh reviews:", error);
    }
  };

  useEffect(() => {
    if (merchant?.id && user?.uid && visible) {
      fetchUserMerchantReview(merchant.id, user.uid)
        .then((rev) => {
          if (rev) {
            setUserRating(rev.rating);
            setReviewComment(rev.comment);
            setHasExistingReview(true);
          } else {
            setUserRating(0);
            setReviewComment("");
            setHasExistingReview(false);
          }
        })
        .catch((err) => console.warn("[MerchantSheet] fetchUserMerchantReview error:", err));

      getSavedMerchantIds(user.uid)
        .then((ids) => setIsSaved(ids.includes(String(merchant.id))))
        .catch((err) => console.warn("[MerchantSheet] getSavedMerchantIds error:", err));
    }
  }, [merchant?.id, user?.uid, visible]);

  const handleToggleSave = async () => {
    if (!merchant || !user?.uid) {
      Alert.alert("Sign In Required", "Please sign in to save this business.");
      return;
    }
    setSavingBookmark(true);
    try {
      const nextSaved = await toggleSaveMerchant(user.uid, merchant.id, isSaved);
      setIsSaved(nextSaved);
      if (nextSaved) {
        try {
          await createMerchantCustomerActivity(String(merchant.id), {
            type: "saved",
            shopperName: user.fullName || user.name || "A shopper",
          });
        } catch (activityError) {
          console.warn(
            "[MerchantSheet] Could not record save activity:",
            activityError
          );
        }
      }
    } catch (err) {
      console.error("[MerchantSheet] handleToggleSave error:", err);
    } finally {
      setSavingBookmark(false);
    }
  };

  if (!merchant) return null;

  const lat = (merchant as any).lat ?? merchant.latitude;
  const lng = (merchant as any).lng ?? merchant.longitude;
  const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  const handleDirections = async () => {
    if (!hasCoords) return;
    await openDirections(lat, lng, merchant.name, merchant.id, user?.uid);
  };

  const handleSubmitReview = async (ratingVal?: number) => {
    const finalRating = ratingVal ?? userRating;
    if (!merchant || !user?.uid) {
      Alert.alert("Sign In Required", "Please sign in to rate this business.");
      return;
    }
    if (finalRating < 1 || finalRating > 5) {
      Alert.alert("Rating Required", "Please select a star rating from 1 to 5.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const ok = await submitMerchantReview(merchant.id, user.uid, finalRating, reviewComment);
      if (ok) {
        setUserRating(finalRating);
        setHasExistingReview(true);
        setReviewSubmitted(true);
        setTimeout(() => setReviewSubmitted(false), 4000);
        try {
          await saveMerchantReviewProfile(
            String(merchant.id),
            user.uid,
            user.fullName || user.name || "Locali shopper",
            user.avatarUrl
          );
        } catch (profileError) {
          console.warn(
            "[MerchantSheet] Could not save reviewer profile details:",
            profileError
          );
        }
        try {
          await createMerchantCustomerActivity(String(merchant.id), {
            type: "review",
            shopperName: user.fullName || user.name || "A shopper",
            rating: finalRating,
            comment: reviewComment.trim(),
          });
        } catch (activityError) {
          console.warn(
            "[MerchantSheet] Could not record review activity:",
            activityError
          );
        }
        await refreshReviews();
      } else {
        Alert.alert("Error", "Could not submit review. Please try again.");
      }
    } catch (err) {
      console.error("[MerchantSheet] submitReview error:", err);
      Alert.alert("Error", "Could not submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClose = () => {
    setShowReport(false);
    setReported(false);
    setReportOption("");
    setReviewSubmitted(false);
    onClose();
  };

  const openBusinessPage = () => {
    if (!merchant) return;
    onClose();
    router.push({
      pathname: "/(shopper)/business/[merchantId]",
      params: { merchantId: String(merchant.id) },
    });
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

          {/* Save / Bookmark button in header */}
          <TouchableOpacity
            style={styles.saveHeaderButton}
            onPress={handleToggleSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            disabled={savingBookmark}
          >
            <BookmarkIcon
              size={20}
              active={isSaved}
              color={isSaved ? Colors.amber[500] : Colors.slate[400]}
            />
          </TouchableOpacity>

          {/* Close button in header */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CloseIcon size={20} color={Colors.slate[500]} />
          </TouchableOpacity>

          <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 24 + insets.bottom },
              ]}
            >
              {/* Cover image */}
              <MerchantPhoto uri={merchant.img} style={styles.coverImage} />

              {/* Title & Status */}
              <View style={styles.titleRow}>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleToggleSave}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={savingBookmark}
                  >
                    <BookmarkIcon
                      size={22}
                      active={isSaved}
                      color={isSaved ? Colors.amber[500] : Colors.slate[400]}
                    />
                  </TouchableOpacity>
                  {merchant.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>New</Text>
                    </View>
                  )}
                </View>
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
                      {reviewAverage > 0
                        ? `${reviewAverage.toFixed(1)} (${reviews.length || merchant.reviews})`
                      : "No rating"}
                  </Text>
                </View>
                <Text style={styles.distanceText}>{merchant.distance}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkBusinessButton}
                onPress={openBusinessPage}
                activeOpacity={0.8}
              >
                <Text style={styles.checkBusinessButtonText}>Check business</Text>
                <RightArrowIcon size={16} color={Colors.teal[700]} />
              </TouchableOpacity>

              {/* Holiday Notice Banner */}
              {showHolidayBanner && (
                <View style={styles.holidayBanner}>
                  <CalendarIcon size={18} color={Colors.amber[700]} />
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
                <LocationIcon size={16} color={Colors.teal[700]} />
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

            {/* Rate & Review Section */}
            <View style={styles.reviewSectionCard}>
              <View style={styles.reviewSectionHeader}>
                <Text style={styles.sectionTitle}>
                  {hasExistingReview ? "Your Rating & Review" : "Rate this Business"}
                </Text>
                {hasExistingReview && (
                  <View style={styles.reviewedBadge}>
                    <Text style={styles.reviewedBadgeText}>Rated</Text>
                  </View>
                )}
              </View>
              <Text style={styles.reviewPromptText}>
                {hasExistingReview
                  ? "Tap any star to change your rating"
                  : "Tap a star to rate your experience"}
              </Text>

              {/* 5 Interactive Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      setUserRating(star);
                      handleSubmitReview(star);
                    }}
                    activeOpacity={0.7}
                    style={styles.starTouchable}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <StarIcon
                      size={28}
                      color={star <= userRating ? Colors.amber[500] : Colors.slate[200]}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {userRating > 0 && (
                <View style={styles.reviewInputContainer}>
                  <TextInput
                    style={styles.reviewCommentInput}
                    placeholder="Write an optional review (how was service, food, atmosphere?)..."
                    placeholderTextColor={Colors.slate[400]}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    numberOfLines={2}
                  />
                  <TouchableOpacity
                    style={[
                      styles.submitReviewButton,
                      isSubmittingReview && { opacity: 0.6 },
                    ]}
                    onPress={() => handleSubmitReview()}
                    disabled={isSubmittingReview}
                    activeOpacity={0.8}
                  >
                    {isSubmittingReview ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.submitReviewButtonText}>
                        {hasExistingReview ? "Update Review" : "Submit Review"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {reviewSubmitted && (
                <View style={styles.reviewSuccessNotice}>
                  <CheckIcon size={14} color={Colors.emerald[700]} />
                  <Text style={styles.reviewSuccessNoticeText}>
                    {hasExistingReview
                      ? "Your rating has been updated!"
                      : "Thank you! Your rating has been submitted."}
                  </Text>
                </View>
              )}

              <View style={styles.reviewsList}>
                <View style={styles.reviewsListHeader}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  {reviews.length > 0 && (
                    <Text style={styles.reviewsCount}>
                      {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                    </Text>
                  )}
                </View>
                {reviewsLoading ? (
                  <ActivityIndicator color={Colors.teal[700]} />
                ) : reviewsError ? (
                  <Text style={styles.reviewsEmpty}>
                    Reviews could not be loaded. Please try again later.
                  </Text>
                ) : reviews.length === 0 ? (
                  <Text style={styles.reviewsEmpty}>
                    No reviews yet. Be the first to share your experience.
                  </Text>
                ) : (
                  reviews.map((review) => {
                    const isOwnReview = review.userId === user?.uid;
                    return (
                      <View
                        key={review.id}
                        style={[
                          styles.reviewItem,
                          isOwnReview && styles.ownReviewItem,
                        ]}
                      >
                        <View style={styles.reviewItemHeader}>
                          {review.avatarUrl ? (
                            <Image
                              source={{ uri: review.avatarUrl }}
                              style={styles.reviewerAvatar}
                            />
                          ) : (
                            <View style={styles.reviewerInitials}>
                              <Text style={styles.reviewerInitialsText}>
                                {review.reviewerName.slice(0, 1).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.reviewerIdentity}>
                            <Text style={styles.reviewerName}>
                              {review.reviewerName}
                              {isOwnReview ? " · You" : ""}
                            </Text>
                            <Text style={styles.reviewDate}>
                              {reviewDateLabel(review.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              size={13}
                              color={
                                star <= review.rating
                                  ? Colors.amber[500]
                                  : Colors.slate[200]
                              }
                            />
                          ))}
                        </View>
                        {review.comment ? (
                          <Text style={styles.reviewComment}>
                            {review.comment}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
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
                  interactive={false}
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
  saveHeaderButton: {
    position: "absolute",
    top: 14,
    right: 54,
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
  checkBusinessButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
  },
  checkBusinessButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  reviewSectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  reviewedBadge: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  reviewedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.amber[800],
  },
  reviewPromptText: {
    fontSize: 12,
    color: Colors.slate[500],
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.lg,
    marginBottom: 12,
  },
  starTouchable: {
    padding: 4,
  },
  reviewInputContainer: {
    gap: 10,
    marginTop: 4,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.lg,
    padding: 12,
    fontSize: 13,
    color: Colors.slate[800],
    backgroundColor: Colors.white,
    minHeight: 60,
    textAlignVertical: "top",
  },
  submitReviewButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  submitReviewButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  reviewSuccessNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.emerald[50],
    borderWidth: 1,
    borderColor: Colors.emerald[200],
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  reviewSuccessNoticeText: {
    fontSize: 12,
    color: Colors.emerald[800],
    fontWeight: "600",
    flex: 1,
  },
  reviewsList: {
    marginTop: 18,
    gap: 10,
  },
  reviewsListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewsCount: {
    color: Colors.slate[400],
    fontSize: 11,
  },
  reviewsEmpty: {
    color: Colors.slate[500],
    fontSize: 12,
    lineHeight: 17,
  },
  reviewItem: {
    borderWidth: 1,
    borderColor: Colors.slate[100],
    borderRadius: Radius.lg,
    padding: 12,
    backgroundColor: Colors.white,
    gap: 7,
  },
  ownReviewItem: {
    borderColor: Colors.teal[200],
    backgroundColor: Colors.teal[50],
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[100],
  },
  reviewerInitials: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  reviewerInitialsText: {
    color: Colors.teal[800],
    fontSize: 13,
    fontWeight: "700",
  },
  reviewerIdentity: {
    flex: 1,
  },
  reviewerName: {
    color: Colors.slate[800],
    fontSize: 12,
    fontWeight: "700",
  },
  reviewDate: {
    color: Colors.slate[400],
    fontSize: 10,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    color: Colors.slate[700],
    fontSize: 12,
    lineHeight: 17,
  },
});
