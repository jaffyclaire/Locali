import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Colors, Radius, Shadows } from "../constants/theme";
import { MerchantPost } from "../types";
import { EditIcon, TrashIcon } from "./icons/AppIcons";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

interface PostCardProps {
  post: MerchantPost;
  businessName: string;
  businessAvatarUrl?: string;
  onPressBusiness?: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  style?: ViewStyle;
}

const getDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const date: unknown = toDate.call(value);
      if (date instanceof Date) return date;
    }
  }
  return null;
};

const timeAgo = (value: unknown): string => {
  const date = getDate(value);
  if (!date) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  businessName,
  businessAvatarUrl,
  onPressBusiness,
  onEdit,
  onDelete,
  style,
}) => {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [captionHasMore, setCaptionHasMore] = useState(false);
  const [imageGridWidth, setImageGridWidth] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [ownerMenuMode, setOwnerMenuMode] = useState<"menu" | "confirm" | null>(null);
  const [ownerMenuPosition, setOwnerMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const ownerMenuButtonRef = useRef<View>(null);
  const images = post.images?.length ? post.images : post.image ? [post.image] : [];
  const visibleImages = images.slice(0, 4);
  const tileWidth = Math.max(0, (imageGridWidth - 6) / 2);
  const normalizedType = post.type.trim().toLowerCase();
  const isPromo = normalizedType === "promo";
  const typeLabel = normalizedType
    ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)
    : "";
  const closeOwnerMenu = () => setOwnerMenuMode(null);
  const openOwnerMenu = () => {
    ownerMenuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const menuHeight = 104;
      const left = Math.max(8, Math.min(x + width - 176, screenWidth - 184));
      const below = y + height + 4;
      const top =
        below + menuHeight <= screenHeight
          ? below
          : Math.max(8, y - menuHeight - 4);
      setOwnerMenuPosition({ left, top });
      setOwnerMenuMode("menu");
    });
  };

  const renderImage = (
    image: string,
    index: number,
    imageStyle: ViewStyle,
    showOverflow = false
  ) => (
    <TouchableOpacity
      key={`${image}-${index}`}
      style={[styles.imageTile, imageStyle]}
      onPress={() => setViewerIndex(index)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Open post image ${index + 1}`}
    >
      <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      {showOverflow && (
        <View style={styles.overflowOverlay}>
          <Text style={styles.overflowText}>+{images.length - 4}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBusiness}
          activeOpacity={onPressBusiness ? 0.75 : 1}
          onPress={onPressBusiness}
          disabled={!onPressBusiness}
        >
          {businessAvatarUrl ? (
            <Image source={{ uri: businessAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {businessName.trim().slice(0, 1).toUpperCase() || "B"}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <View style={styles.nameAndType}>
              <Text style={styles.businessName} numberOfLines={1}>
                {businessName}
              </Text>
              {!!typeLabel && (
                <View style={[styles.typeTag, isPromo ? styles.promoTag : styles.updateTag]}>
                  <Text style={[styles.typeText, isPromo ? styles.promoText : styles.updateText]}>
                    {typeLabel}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {onEdit && onDelete && (
          <View ref={ownerMenuButtonRef} style={styles.ownerMenuAnchor}>
            <TouchableOpacity
              style={styles.ownerMenuButton}
              onPress={openOwnerMenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Post actions"
              hitSlop={4}
            >
              <Text style={styles.ownerMenuIcon}>...</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={ownerMenuMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeOwnerMenu}
      >
        <View style={styles.ownerMenuOverlay}>
          <TouchableOpacity
            style={styles.ownerMenuBackdrop}
            activeOpacity={1}
            onPress={closeOwnerMenu}
            accessibilityLabel="Close post actions"
          />
          {ownerMenuPosition && <View style={[styles.ownerMenu, ownerMenuPosition]}>
            {ownerMenuMode === "confirm" ? (
              <>
                <Text style={styles.confirmTitle}>Delete this post?</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.cancelConfirmButton]}
                    onPress={closeOwnerMenu}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.deleteConfirmButton]}
                    onPress={() => {
                      closeOwnerMenu();
                      void onDelete?.();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuAction}
                  onPress={() => {
                    closeOwnerMenu();
                    onEdit?.();
                  }}
                  activeOpacity={0.7}
                >
                  <EditIcon size={16} color={Colors.slate[700]} />
                  <Text style={styles.menuActionText}>Edit post</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuAction}
                  onPress={() => setOwnerMenuMode("confirm")}
                  activeOpacity={0.7}
                >
                  <TrashIcon size={16} color={Colors.rose[600]} />
                  <Text style={styles.deleteActionText}>Delete post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>}
        </View>
      </Modal>

      {!!post.caption && (
        <View style={styles.captionContainer}>
          <Text
            style={styles.caption}
            numberOfLines={captionExpanded ? undefined : 3}
            onTextLayout={(event) => {
              if (!captionExpanded) {
                setCaptionHasMore(event.nativeEvent.lines.length > 3);
              }
            }}
          >
            {post.caption}
          </Text>
          {captionHasMore && (
            <Text
              onPress={() => setCaptionExpanded((expanded) => !expanded)}
              style={styles.seeMore}
            >
              {captionExpanded ? "See less" : "See more"}
            </Text>
          )}
        </View>
      )}

      {visibleImages.length > 0 && (
        <View
          style={styles.imageGrid}
          onLayout={(event) => setImageGridWidth(event.nativeEvent.layout.width)}
        >
          {visibleImages.length === 1
            ? renderImage(visibleImages[0], 0, {
                width: "100%",
                height: Math.min(250, Math.max(160, imageGridWidth * 0.68)),
              })
            : visibleImages.length === 2
              ? visibleImages.map((image, index) =>
                  renderImage(image, index, {
                    width: tileWidth,
                    height: Math.min(190, Math.max(130, tileWidth * 0.78)),
                  })
                )
              : visibleImages.length === 3
                ? (
                    <View style={styles.threeImageLayout}>
                      {renderImage(visibleImages[0], 0, {
                        width: imageGridWidth * 0.62,
                        height: 210,
                      })}
                      <View style={styles.smallImageColumn}>
                        {visibleImages.slice(1).map((image, index) =>
                          renderImage(image, index + 1, { flex: 1 })
                        )}
                      </View>
                    </View>
                  )
                : visibleImages.map((image, index) =>
                    renderImage(
                      image,
                      index,
                      { width: tileWidth, height: Math.min(170, Math.max(120, tileWidth * 0.78)) },
                      index === 3 && images.length > 4
                    )
                  )}
        </View>
      )}

      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={styles.viewer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerIndex(null)}
            accessibilityRole="button"
            accessibilityLabel="Close image viewer"
          >
            <Text style={styles.viewerCloseText}>Close</Text>
          </TouchableOpacity>
          {viewerIndex !== null && (
            <ScrollView
              key={viewerIndex}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: viewerIndex * screenWidth, y: 0 }}
              onMomentumScrollEnd={(event) => {
                setViewerIndex(
                  Math.max(
                    0,
                    Math.min(
                      images.length - 1,
                      Math.round(event.nativeEvent.contentOffset.x / screenWidth)
                    )
                  )
                );
              }}
              style={styles.viewerImages}
            >
              {images.map((image, index) => (
                <Image
                  key={`${image}-viewer-${index}`}
                  source={{ uri: image }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
          )}
          {viewerIndex !== null && (
            <Text style={styles.viewerCount}>
              {viewerIndex + 1} / {images.length}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  headerBusiness: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[100],
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[100],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: Colors.teal[800],
    fontWeight: "700",
    fontSize: 16,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameAndType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  businessName: {
    flexShrink: 1,
    color: Colors.slate[900],
    fontSize: 14,
    fontWeight: "700",
  },
  postTime: {
    color: Colors.slate[400],
    fontSize: 11,
    marginTop: 2,
  },
  typeTag: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  promoTag: {
    backgroundColor: Colors.amber[50],
  },
  updateTag: {
    backgroundColor: Colors.teal[50],
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  promoText: {
    color: Colors.amber[800],
  },
  updateText: {
    color: Colors.teal[700],
  },
  captionContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  caption: {
    color: Colors.slate[800],
    fontSize: 13,
    lineHeight: 19,
  },
  seeMore: {
    color: Colors.teal[700],
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignSelf: "stretch",
    marginHorizontal: 14,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  imageTile: {
    overflow: "hidden",
    backgroundColor: Colors.slate[100],
  },
  image: {
    width: "100%",
    height: "100%",
  },
  threeImageLayout: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
  },
  smallImageColumn: {
    flex: 1,
    gap: 6,
    height: 210,
  },
  overflowOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  overflowText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 48,
    right: 18,
    zIndex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  viewerCloseText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 13,
  },
  viewerImages: {
    flexGrow: 0,
  },
  viewerImage: {
    width: screenWidth,
    height: screenHeight,
  },
  viewerCount: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    color: Colors.white,
    fontSize: 13,
  },
  ownerMenuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[50],
  },
  ownerMenuAnchor: {
    width: 40,
    height: 40,
  },
  ownerMenuIcon: {
    color: Colors.slate[700],
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: 1,
  },
  ownerMenuOverlay: {
    flex: 1,
  },
  ownerMenuBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.transparent,
  },
  ownerMenu: {
    position: "absolute",
    minWidth: 176,
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  menuAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.slate[200],
    marginHorizontal: 10,
  },
  menuActionText: {
    color: Colors.slate[800],
    fontSize: 15,
    fontWeight: "600",
  },
  deleteActionText: {
    color: Colors.rose[600],
    fontSize: 15,
    fontWeight: "700",
  },
  confirmTitle: {
    color: Colors.slate[900],
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  confirmButton: {
    minHeight: 44,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  },
  cancelConfirmButton: {
    backgroundColor: Colors.slate[50],
  },
  deleteConfirmButton: {
    backgroundColor: Colors.rose[50],
  },
});
