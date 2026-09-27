import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MAP_CATEGORIES } from "../../data/mockData";
import { Colors, Radius, Shadows } from "../../constants/theme";

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  filterOpenNow: boolean;
  onToggleOpenNow: () => void;
  filterVerified: boolean;
  onToggleVerified: () => void;
  distanceKm: number;
  onChangeDistance: (km: number) => void;
  onReset: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  activeCategory,
  onSelectCategory,
  filterOpenNow,
  onToggleOpenNow,
  filterVerified,
  onToggleVerified,
  distanceKm,
  onChangeDistance,
  onReset,
}) => {
  const DISTANCE_STEPS = [1, 2, 3, 5, 8, 10];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Distance Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Distance</Text>
                <Text style={styles.distanceValue}>{distanceKm} km</Text>
              </View>
              <View style={styles.distancePillsRow}>
                {DISTANCE_STEPS.map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => onChangeDistance(km)}
                    style={[
                      styles.distancePill,
                      distanceKm === km && styles.distancePillActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.distancePillText,
                        distanceKm === km && styles.distancePillTextActive,
                      ]}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.categoryPillsContainer}>
                {MAP_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => onSelectCategory(cat)}
                    style={[
                      styles.categoryPill,
                      activeCategory === cat && styles.categoryPillActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        activeCategory === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Toggles */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Open Now</Text>
                  <Text style={styles.toggleSub}>
                    Only show currently open businesses
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onToggleOpenNow}
                  style={[
                    styles.toggleTrack,
                    filterOpenNow
                      ? styles.toggleTrackActive
                      : styles.toggleTrackInactive,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      filterOpenNow
                        ? styles.toggleThumbActive
                        : styles.toggleThumbInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Verified Today</Text>
                  <Text style={styles.toggleSub}>
                    Owner confirmed hours today
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onToggleVerified}
                  style={[
                    styles.toggleTrack,
                    filterVerified
                      ? styles.toggleTrackActive
                      : styles.toggleTrackInactive,
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      filterVerified
                        ? styles.toggleThumbActive
                        : styles.toggleThumbInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.applyButton}
              activeOpacity={0.85}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
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
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius["3xl"],
    borderTopRightRadius: Radius["3xl"],
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "80%",
    ...Shadows.xl,
  },
  handleContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.slate[200],
    borderRadius: Radius.full,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
    marginBottom: 8,
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  distancePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  distancePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    backgroundColor: Colors.white,
  },
  distancePillActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  distancePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  distancePillTextActive: {
    color: Colors.white,
  },
  categoryPillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    backgroundColor: Colors.white,
  },
  categoryPillActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.slate[600],
  },
  categoryPillTextActive: {
    color: Colors.white,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  toggleSub: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: Radius.full,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: Colors.teal[700],
  },
  toggleTrackInactive: {
    backgroundColor: Colors.slate[200],
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  toggleThumbInactive: {
    alignSelf: "flex-start",
  },
  applyButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 14,
    borderRadius: Radius.xl,
    alignItems: "center",
    marginTop: 10,
    ...Shadows.md,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});

