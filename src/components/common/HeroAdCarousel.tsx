import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { fetchSponsoredCards } from "../../services/firestoreService";
import { MapMerchant, SponsoredCardItem } from "../../types";

const { width } = Dimensions.get("window");

interface HeroAdCarouselProps {
  merchants: MapMerchant[];
  onPressViewMore: (merchant: MapMerchant | null) => void;
}

export const HeroAdCarousel: React.FC<HeroAdCarouselProps> = ({
  merchants,
  onPressViewMore,
}) => {
  const carouselRef = useRef<ScrollView | null>(null);
  const [active, setActive] = useState(0);
  const [ads, setAds] = useState<SponsoredCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const slideWidth = width - 32;

  useEffect(() => {
    const loadAds = async () => {
      setLoading(true);
      try {
        const data = await fetchSponsoredCards();
        setAds(data);
      } catch (error) {
        console.error("[HeroAdCarousel] Error loading ads:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    loadAds();
  }, []);

  useEffect(() => {
    if (ads.length < 2 || isDragging) return;
    const timer = setTimeout(() => {
      const next = (active + 1) % ads.length;
      setActive(next);
      carouselRef.current?.scrollTo({
        x: next * slideWidth,
        animated: true,
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [active, ads.length, isDragging, slideWidth]);

  if (loading && ads.length === 0) {
    return (
      <View style={[styles.loadingContainer, styles.messageCard]}>
        <ActivityIndicator color={Colors.teal[700]} />
        <Text style={styles.messageText}>Loading promotions...</Text>
      </View>
    );
  }

  if (ads.length === 0) {
    return (
      <View style={[styles.loadingContainer, styles.messageCard]}>
        <Text style={styles.messageText}>
          {loadError
            ? "Promotions could not be loaded. Please try again later."
            : "No promotions available right now."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setIsDragging(true)}
        onScrollEndDrag={() => setIsDragging(false)}
        onMomentumScrollEnd={(event) => {
          setActive(
            Math.min(
              ads.length - 1,
              Math.max(0, Math.round(event.nativeEvent.contentOffset.x / slideWidth))
            )
          );
        }}
      >
        {ads.map((ad) => (
          <View key={ad.id} style={[styles.card, { width: slideWidth }]}>
            <Image
              source={{ uri: ad.img }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />

            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>SPONSORED</Text>
            </View>

            <View style={styles.dotsContainer}>
              {ads.map((_, dotIndex) => (
                <TouchableOpacity
                  key={dotIndex}
                  onPress={() => {
                    setActive(dotIndex);
                    carouselRef.current?.scrollTo({
                      x: dotIndex * slideWidth,
                      animated: true,
                    });
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.dot,
                    dotIndex === active ? styles.activeDot : styles.inactiveDot,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show deal ${dotIndex + 1}`}
                />
              ))}
            </View>

            <View style={styles.content}>
              <Text style={styles.merchantName}>
                {ad.businessName || ad.name}
              </Text>
              <Text style={styles.headline} numberOfLines={2}>
                {ad.discount}
              </Text>
              <Text style={styles.subText} numberOfLines={1}>
                {ad.category}
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  const merchant =
                    merchants.find(
                      (item) =>
                        ad.merchantId != null &&
                        String(item.id) === String(ad.merchantId)
                    ) ||
                    merchants.find(
                      (item) =>
                        item.name.trim().toLowerCase() ===
                        (ad.businessName || ad.name).trim().toLowerCase()
                    );
                  if (merchant) {
                    onPressViewMore(merchant);
                    return;
                  }

                  const categoryMatches = merchants.filter(
                    (item) =>
                      item.category.trim().toLowerCase() ===
                      ad.category.trim().toLowerCase()
                  );
                  onPressViewMore(
                    categoryMatches.length === 1 ? categoryMatches[0] : null
                  );
                  if (categoryMatches.length !== 1) {
                    Alert.alert(
                      "Business unavailable",
                      "This promotion is not linked to a business listing yet."
                    );
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>View more</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[100],
    borderRadius: Radius["2xl"],
  },
  messageCard: {
    paddingHorizontal: 20,
    gap: 10,
  },
  messageText: {
    color: Colors.slate[500],
    fontSize: 13,
    textAlign: "center",
  },
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  card: {
    width: "100%",
    height: 180,
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    position: "relative",
    backgroundColor: Colors.slate[200],
    ...Shadows.md,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sponsoredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  sponsoredText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dotsContainer: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    borderRadius: Radius.full,
  },
  activeDot: {
    width: 16,
    height: 6,
    backgroundColor: Colors.white,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  merchantName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  headline: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  subText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginBottom: 10,
  },
  ctaButton: {
    backgroundColor: Colors.white,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  ctaText: {
    color: Colors.slate[900],
    fontSize: 13,
    fontWeight: "700",
  },
});
