import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { HERO_ADS } from "../../data/mockData";
import { Colors, Radius, Shadows } from "../../constants/theme";

const { width } = Dimensions.get("window");

export const HeroAdCarousel: React.FC = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % HERO_ADS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentAd = HERO_ADS[active];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={{ uri: currentAd.img }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Dark overlay */}
        <View style={[styles.overlay, { backgroundColor: currentAd.accent }]} />

        {/* Sponsored Tag */}
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>SPONSORED</Text>
        </View>

        {/* Dot Indicators */}
        <View style={styles.dotsContainer}>
          {HERO_ADS.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActive(i)}
              activeOpacity={0.7}
              style={[
                styles.dot,
                i === active ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.merchantName}>{currentAd.merchant}</Text>
          <Text style={styles.headline} numberOfLines={2}>
            {currentAd.headline}
          </Text>
          <Text style={styles.subText} numberOfLines={1}>
            {currentAd.sub}
          </Text>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{currentAd.cta}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
