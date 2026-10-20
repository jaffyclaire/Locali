import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Colors, Radius, Shadows } from "../constants/theme";
import {
  BookmarkIcon,
  ClockIcon,
  LocationIcon,
  StarIcon,
  TagIcon,
} from "./icons/AppIcons";
import { Merchant, MerchantPost } from "../types";
import { PostCard } from "./PostCard";

interface BusinessProfileProps {
  merchant: Merchant | null;
  posts?: MerchantPost[];
  postsLoading?: boolean;
  postsError?: boolean;
  isSaved?: boolean;
  saving?: boolean;
  onToggleSave?: () => void;
  onGetDirections?: () => void;
  style?: ViewStyle;
}

const WEEK_DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

export const BusinessProfile: React.FC<BusinessProfileProps> = ({
  merchant,
  posts = [],
  postsLoading = false,
  postsError = false,
  isSaved = false,
  saving = false,
  onToggleSave,
  onGetDirections,
  style,
}) => {
  const coverImage = merchant?.coverPhotoUrl || merchant?.img;
  const hasHours = WEEK_DAYS.some(([key]) => merchant?.weeklyHours?.[key]);
  const showPosts = postsLoading || postsError || posts.length > 0;
  const hasShopperActions = !!onToggleSave && !!onGetDirections;
  const saveButton = onToggleSave ? (
    <TouchableOpacity
      style={styles.bookmarkButton}
      onPress={onToggleSave}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? "Remove saved business" : "Save business"}
    >
      {saving ? (
        <ActivityIndicator size="small" color={Colors.teal[700]} />
      ) : (
        <BookmarkIcon
          size={20}
          active={isSaved}
          color={isSaved ? Colors.amber[500] : Colors.slate[500]}
        />
      )}
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.container, style]}>
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
          accessibilityLabel={`${merchant?.name || "Business"} cover`}
        />
      ) : (
        <View style={[styles.coverImage, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>No cover photo</Text>
        </View>
      )}

      <View style={styles.profileCard}>
        <Text style={styles.businessName}>
          {merchant?.name || "Untitled Business"}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>
              {merchant?.category || "Uncategorized"}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <StarIcon size={14} color={Colors.amber[500]} />
            <Text style={styles.ratingText}>
              {merchant?.rating ?? 0} ({merchant?.reviews ?? 0})
            </Text>
          </View>
          {merchant && (
            <View
              style={[
                styles.statusPill,
                merchant.isOpen ? styles.openStatus : styles.closedStatus,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  merchant.isOpen ? styles.openText : styles.closedText,
                ]}
              >
                {merchant.isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <ClockIcon size={16} color={Colors.slate[600]} />
            <Text style={styles.detailText}>
              {merchant?.hours || "Hours not set"}
            </Text>
          </View>
          {hasHours &&
            WEEK_DAYS.map(([key, label]) => {
              const hours = merchant?.weeklyHours?.[key];
              return (
                <View key={key} style={styles.hoursRow}>
                  <Text style={styles.dayText}>{label}</Text>
                  <Text
                    style={[
                      styles.hoursText,
                      hours?.isClosed && styles.closedHoursText,
                    ]}
                  >
                    {!hours
                      ? "Not set"
                      : hours.isClosed
                        ? "Closed"
                        : `${hours.openTime} – ${hours.closeTime}`}
                  </Text>
                </View>
              );
            })}
          {!!merchant?.address && (
            <View style={styles.detailRow}>
              <LocationIcon size={16} color={Colors.slate[600]} />
              <Text style={styles.detailText}>{merchant.address}</Text>
            </View>
          )}
          {!!merchant?.contact && (
            <View style={styles.detailRow}>
              <TagIcon size={16} color={Colors.slate[600]} />
              <Text style={styles.detailText}>{merchant.contact}</Text>
            </View>
          )}
          {!!merchant?.description && (
            <View style={styles.detailRow}>
              <TagIcon size={16} color={Colors.slate[600]} />
              <Text style={styles.detailText}>{merchant.description}</Text>
            </View>
          )}
        </View>
        {hasShopperActions && (
          <View style={styles.actionRow}>
            {saveButton}
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={onGetDirections}
              accessibilityRole="button"
            >
              <Text style={styles.directionsText}>Get directions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showPosts && (
        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>Posts</Text>
          {postsLoading ? (
            <View style={styles.postsState}>
              <ActivityIndicator color={Colors.teal[700]} />
              <Text style={styles.postsStateText}>Loading posts...</Text>
            </View>
          ) : postsError ? (
            <Text style={styles.postsEmpty}>
              Posts could not be loaded. Please try again later.
            </Text>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                businessName={merchant?.name || "Your business"}
                businessAvatarUrl={merchant?.img}
                style={styles.postCard}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: Radius["2xl"],
    backgroundColor: Colors.slate[100],
    marginBottom: 16,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  coverPlaceholderText: {
    color: Colors.slate[400],
    fontSize: 13,
    fontWeight: "500",
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  businessName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: Colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[700],
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  openStatus: {
    backgroundColor: Colors.emerald[50],
  },
  closedStatus: {
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
    color: Colors.slate[600],
  },
  detailsBox: {
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.slate[600],
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    backgroundColor: Colors.white,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 26,
  },
  dayText: {
    color: Colors.slate[600],
    fontSize: 12,
    fontWeight: "600",
  },
  hoursText: {
    color: Colors.slate[600],
    fontSize: 12,
    textAlign: "right",
  },
  closedHoursText: {
    color: Colors.slate[400],
  },
  postsSection: {
    marginTop: 20,
    gap: 12,
  },
  postsTitle: {
    color: Colors.slate[900],
    fontSize: 18,
    fontWeight: "700",
  },
  postsState: {
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postsStateText: {
    color: Colors.slate[500],
    fontSize: 13,
  },
  postsEmpty: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    color: Colors.slate[500],
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  postCard: {
    marginBottom: 4,
  },
  directionsButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
  },
  directionsText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
