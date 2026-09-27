import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Merchant } from "../../types";
import MerchantMap from "../MerchantMap";
import { DAILY_HOURS } from "../../data/mockData";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { StarIcon, CheckIcon, CloseIcon } from "../icons/AppIcons";

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
  const [reported, setReported] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportOption, setReportOption] = useState("");

  if (!merchant) return null;

  const lat = (merchant as any).lat ?? 37.7749;
  const lng = (merchant as any).lng ?? -122.4194;

  const handleClose = () => {
    setShowReport(false);
    setReported(false);
    setReportOption("");
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
                  {merchant.rating} ({merchant.reviews})
                </Text>
              </View>
              <Text style={styles.distanceText}>{merchant.distance}</Text>
            </View>

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
                  Confirmed at 8:42 AM · Hours: {merchant.hours}
                </Text>
              </View>
            )}

            {/* Store details card with daily hours */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Store Details</Text>
              <View style={styles.addressRow}>
                <Text style={styles.pinEmoji}>📍</Text>
                <Text style={styles.addressText}>{merchant.address || "12 Market St, Downtown"}</Text>
              </View>

              <View style={styles.hoursList}>
                {DAILY_HOURS.map((h) => (
                  <View key={h.day} style={styles.hourRow}>
                    <Text style={styles.dayText}>{h.day}</Text>
                    <Text
                      style={[
                        styles.timeText,
                        h.hours === "Closed" && styles.closedTimeText,
                      ]}
                    >
                      {h.hours}
                    </Text>
                  </View>
                ))}
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
                <TouchableOpacity style={styles.directionsButton} activeOpacity={0.8}>
                  <Text style={styles.directionsText}>Get Directions</Text>
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
});
