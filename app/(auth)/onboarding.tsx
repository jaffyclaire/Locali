import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { fetchInterests, InterestItem } from "../../src/services/firestoreService";

export default function OnboardingScreen() {
  const router = useRouter();
  const { signIn } = useAuthRole();
  const [selected, setSelected] = useState<string[]>(["Coffee"]);
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInterests = async () => {
      setLoading(true);
      try {
        const data = await fetchInterests();
        console.log("[OnboardingScreen] Fetched interests:", data.length);
        setInterests(data);
      } catch (error) {
        console.error("[OnboardingScreen] Error loading interests:", error);
      } finally {
        setLoading(false);
      }
    };
    loadInterests();
  }, []);

  const toggleInterest = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleFinish = () => {
    signIn("shopper");
    router.replace("/(shopper)/home");
  };

  console.log("[OnboardingScreen] loading:", loading, "interests:", interests.length);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>✨</Text>
            </View>
            <Text style={styles.title}>What are you into?</Text>
            <Text style={styles.subtitle}>
              Pick your interests and we'll tailor your local feed
            </Text>
          </View>

          {/* Interest pills */}
          <View style={styles.pillsGrid}>
            {interests.map((item) => {
              const isSelected = selected.includes(item.name);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleInterest(item.name)}
                  style={[
                    styles.pill,
                    isSelected ? styles.pillSelected : styles.pillUnselected,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isSelected
                        ? styles.pillTextSelected
                        : styles.pillTextUnselected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <Text style={styles.countText}>
            {selected.length} interest{selected.length !== 1 ? "s" : ""} selected
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              selected.length === 0 && styles.buttonDisabled,
            ]}
            onPress={handleFinish}
            disabled={selected.length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 28,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconEmoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.slate[500],
    lineHeight: 20,
  },
  pillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pillSelected: {
    backgroundColor: Colors.teal[50],
    borderColor: Colors.teal[700],
  },
  pillUnselected: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate[200],
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: Colors.teal[800],
  },
  pillTextUnselected: {
    color: Colors.slate[600],
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.slate[100],
    backgroundColor: Colors.white,
  },
  countText: {
    fontSize: 12,
    color: Colors.slate[400],
    textAlign: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
