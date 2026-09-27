import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SponsoredCardItem } from "../../types";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { StarIcon } from "../icons/AppIcons";

interface SponsoredCardProps {
  card: SponsoredCardItem;
  onPress?: () => void;
}

export const SponsoredCard: React.FC<SponsoredCardProps> = ({ card, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: card.img }} style={styles.image} resizeMode="cover" />
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{card.discount}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {card.name}
          </Text>
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <StarIcon size={12} color={Colors.amber[500]} />
            <Text style={styles.metaText}>{card.rating}</Text>
          </View>
          <Text style={styles.dotSeparator}>·</Text>
          <Text style={styles.metaText}>{card.distance}</Text>
          <Text style={styles.dotSeparator}>·</Text>
          <Text style={styles.metaText}>{card.category}</Text>
        </View>

        <View style={styles.footerRow}>
          <View
            style={[
              styles.statusBadge,
              card.isOpen ? styles.openBadge : styles.closedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                card.isOpen ? styles.openText : styles.closedText,
              ]}
            >
              {card.isOpen ? "Open Now" : "Closed"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  imageContainer: {
    width: "100%",
    height: 128,
    position: "relative",
    backgroundColor: Colors.slate[100],
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.amber[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  discountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[900],
    flex: 1,
  },
  sponsoredBadge: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginLeft: 8,
  },
  sponsoredText: {
    color: Colors.amber[800],
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingBox: {
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
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
});

