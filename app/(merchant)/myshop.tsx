import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  StarIcon,
  PlusIcon,
  ClockIcon,
  LocationIcon,
  TagIcon,
  BoltIcon,
  RightArrowIcon,
  CloseIcon,
  CheckIcon,
} from "../../src/components/icons/AppIcons";
import { HolidayClosureCard } from "../../src/components/common/HolidayClosureCard";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  fetchMerchantByOwner,
  fetchMerchants,
  updateMerchantDoc,
} from "../../src/services/firestoreService";
import {
  pickImageFromGallery,
  uploadImageAsync,
} from "../../src/services/storageService";
import { Merchant, OperatingHoursDay } from "../../src/types";

const DAYS_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MerchantMyShop() {
  const { user } = useAuthRole();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [previewMode, setPreviewMode] = useState(false);
  const [dayHours, setDayHours] = useState<{ [key: string]: boolean }>({
    Mon: true,
    Tue: true,
    Wed: true,
    Thu: true,
    Fri: true,
    Sat: true,
    Sun: false,
  });

  // Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState<
    "Name" | "Category" | "Description" | "Contact" | "Address" | null
  >(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  const loadMerchant = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      let m: Merchant | null = null;
      if (user?.uid) {
        m = await fetchMerchantByOwner(user.uid);
      }
      if (!m) {
        const all = await fetchMerchants({ limitCount: 1 });
        if (all.length > 0) m = all[0];
      }

      if (m) {
        setMerchant(m);
        if (m.weeklyHours) {
          const map: { [key: string]: boolean } = {};
          DAYS_KEYS.forEach((d) => {
            const dayKey = d.toLowerCase();
            const data = m?.weeklyHours?.[dayKey];
            map[d] = data ? !data.isClosed : d !== "Sun";
          });
          setDayHours(map);
        }
      }
    } catch (err) {
      console.warn("loadMerchant error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadMerchant();
  }, [loadMerchant]);

  const handleChangeCover = async () => {
    if (!merchant) return;
    try {
      const uri = await pickImageFromGallery();
      if (!uri) return;

      setUploadingCover(true);
      const remotePath = `merchants/${merchant.id}/cover-${Date.now()}.jpg`;
      const downloadUrl = await uploadImageAsync(uri, remotePath);

      await updateMerchantDoc(String(merchant.id), {
        coverPhotoUrl: downloadUrl,
        img: downloadUrl,
      });

      setMerchant((prev) =>
        prev
          ? {
              ...prev,
              coverPhotoUrl: downloadUrl,
              img: downloadUrl,
            }
          : prev
      );
    } catch (err) {
      console.error("handleChangeCover error:", err);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddGalleryPhoto = async () => {
    if (!merchant) return;
    try {
      const uri = await pickImageFromGallery();
      if (!uri) return;

      setUploadingGallery(true);
      const remotePath = `merchants/${merchant.id}/gallery-${Date.now()}.jpg`;
      const downloadUrl = await uploadImageAsync(uri, remotePath);

      const existingPhotos = merchant.photos || [];
      const updatedPhotos = [...existingPhotos, downloadUrl];

      await updateMerchantDoc(String(merchant.id), {
        photos: updatedPhotos,
      });

      setMerchant((prev) =>
        prev
          ? {
              ...prev,
              photos: updatedPhotos,
            }
          : prev
      );
    } catch (err) {
      console.error("handleAddGalleryPhoto error:", err);
      Alert.alert("Upload Failed", "Could not upload photo. Please try again.");
    } finally {
      setUploadingGallery(false);
    }
  };

  const openEditModal = (
    field: "Name" | "Category" | "Description" | "Contact" | "Address"
  ) => {
    setEditField(field);
    if (!merchant) {
      setEditValue("");
    } else {
      switch (field) {
        case "Name":
          setEditValue(merchant.name || "");
          break;
        case "Category":
          setEditValue(merchant.category || "");
          break;
        case "Description":
          setEditValue(merchant.description || "");
          break;
        case "Contact":
          setEditValue(merchant.contact || "");
          break;
        case "Address":
          setEditValue(merchant.address || "");
          break;
      }
    }
    setModalVisible(true);
  };

  const handleSaveField = async () => {
    if (!merchant || !editField) return;
    setSavingField(true);
    try {
      const payload: Partial<Merchant> = {};
      switch (editField) {
        case "Name":
          payload.name = editValue.trim();
          break;
        case "Category":
          payload.category = editValue.trim();
          break;
        case "Description":
          payload.description = editValue.trim();
          break;
        case "Contact":
          payload.contact = editValue.trim();
          break;
        case "Address":
          payload.address = editValue.trim();
          break;
      }

      await updateMerchantDoc(String(merchant.id), payload);
      setMerchant((prev) => (prev ? { ...prev, ...payload } : prev));
      setModalVisible(false);
    } catch (err) {
      console.error("handleSaveField error:", err);
      Alert.alert("Save Failed", "Could not update information.");
    } finally {
      setSavingField(false);
    }
  };

  const persistWeeklyHours = async (newHours: { [key: string]: boolean }) => {
    if (!merchant) return;
    try {
      const weeklyHoursRecord: Record<string, OperatingHoursDay> = {};
      Object.entries(newHours).forEach(([day, open]) => {
        weeklyHoursRecord[day.toLowerCase()] = {
          openTime: "7:00 AM",
          closeTime: "9:00 PM",
          isClosed: !open,
        };
      });
      await updateMerchantDoc(String(merchant.id), {
        weeklyHours: weeklyHoursRecord,
      });
    } catch (err) {
      console.warn("persistWeeklyHours error:", err);
    }
  };

  const setAllDays = () => {
    const updated = {
      Mon: true,
      Tue: true,
      Wed: true,
      Thu: true,
      Fri: true,
      Sat: true,
      Sun: true,
    };
    setDayHours(updated);
    persistWeeklyHours(updated);
  };

  const toggleDay = (day: string) => {
    setDayHours((prev) => {
      const next = { ...prev, [day]: !prev[day] };
      persistWeeklyHours(next);
      return next;
    });
  };

  if (previewMode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          {/* Preview Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Customer Preview</Text>
              <Text style={styles.headerSubtitle}>
                How shoppers see your listing
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPreviewMode(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.editModeLink}>← Edit Mode</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.previewScrollContent}
          >
            <Image
              source={{
                uri:
                  merchant?.coverPhotoUrl ||
                  merchant?.img ||
                  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=200&fit=crop&auto=format",
              }}
              style={styles.previewCoverImage}
              resizeMode="cover"
            />
            <View style={styles.previewCard}>
              <Text style={styles.previewMerchantName}>
                {merchant?.name || "Brew & Co."}
              </Text>
              <View style={styles.previewMetaRow}>
                <View style={styles.previewTagPill}>
                  <Text style={styles.previewTagText}>
                    {merchant?.category || "Coffee"}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <StarIcon size={14} color={Colors.amber[500]} />
                  <Text style={styles.previewRatingText}>
                    {merchant?.rating || 4.8} ({merchant?.reviews || 312})
                  </Text>
                </View>
              </View>

              <View style={styles.previewDetailsBox}>
                <View style={styles.previewDetailRow}>
                  <ClockIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.hours || "7:00 AM – 9:00 PM"}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <LocationIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.address || "12 Market St, Downtown"}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <TagIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.description || "Specialty single-origin coffee"}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const galleryImages =
    merchant?.photos && merchant.photos.length > 0
      ? merchant.photos
      : [
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=80&h=80&fit=crop",
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=80&h=80&fit=crop",
        ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Edit Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Shop</Text>
            <Text style={styles.headerSubtitle}>Manage your listing</Text>
          </View>
          <TouchableOpacity
            style={styles.previewPillButton}
            onPress={() => setPreviewMode(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.previewPillText}>See what customers see →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMerchant(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading && !merchant ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : (
            <>
              {/* Cover Photo & Gallery */}
              <View style={styles.card}>
                <View style={styles.coverPhotoContainer}>
                  <Image
                    source={{
                      uri:
                        merchant?.coverPhotoUrl ||
                        merchant?.img ||
                        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=140&fit=crop&auto=format",
                    }}
                    style={styles.coverPhotoImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.changeCoverButton}
                    onPress={handleChangeCover}
                    disabled={uploadingCover}
                    activeOpacity={0.8}
                  >
                    {uploadingCover ? (
                      <ActivityIndicator size="small" color={Colors.slate[800]} />
                    ) : (
                      <Text style={styles.changeCoverText}>Change</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.galleryContainer}>
                  <Text style={styles.galleryTitle}>Photo Gallery</Text>
                  <View style={styles.galleryRow}>
                    {galleryImages.map((src, i) => (
                      <Image
                        key={i}
                        source={{ uri: src }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    ))}
                    <TouchableOpacity
                      style={styles.addGalleryButton}
                      onPress={handleAddGalleryPhoto}
                      disabled={uploadingGallery}
                      activeOpacity={0.7}
                    >
                      {uploadingGallery ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.slate[500]}
                        />
                      ) : (
                        <PlusIcon size={20} color={Colors.slate[400]} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Editable Fields */}
              {[
                {
                  label: "Business Name",
                  field: "Name" as const,
                  value: merchant?.name || "Brew & Co.",
                },
                {
                  label: "Category",
                  field: "Category" as const,
                  value: merchant?.category || "Coffee",
                },
                {
                  label: "Description",
                  field: "Description" as const,
                  value:
                    merchant?.description ||
                    "Specialty coffee in the heart of downtown.",
                },
                {
                  label: "Contact",
                  field: "Contact" as const,
                  value: merchant?.contact || "+1 (415) 555-0192",
                },
                {
                  label: "Address",
                  field: "Address" as const,
                  value: merchant?.address || "12 Market St, Downtown SF",
                },
              ].map((f) => (
                <View key={f.label} style={styles.fieldCard}>
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <Text style={styles.fieldValue} numberOfLines={2}>
                      {f.value}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditModal(f.field)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editFieldLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Day-by-Day Hours */}
              <View style={styles.card}>
                <View style={styles.weeklyHoursHeader}>
                  <Text style={styles.weeklyHoursTitle}>Weekly Hours</Text>
                  <TouchableOpacity onPress={setAllDays} activeOpacity={0.7}>
                    <Text style={styles.setAllLink}>Set Same for All Days</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.hoursList}>
                  {Object.entries(dayHours).map(([day, open], idx, arr) => (
                    <View
                      key={day}
                      style={[
                        styles.dayRow,
                        idx === arr.length - 1 && styles.dayRowLast,
                      ]}
                    >
                      <Text style={styles.dayLabel}>{day}</Text>
                      <View style={styles.dayControls}>
                        {open ? (
                          <Text style={styles.dayHoursText}>
                            7:00 AM – 9:00 PM
                          </Text>
                        ) : (
                          <Text style={styles.dayClosedText}>Closed</Text>
                        )}
                        <TouchableOpacity
                          onPress={() => toggleDay(day)}
                          style={[
                            styles.dayToggleTrack,
                            open
                              ? styles.dayToggleTrackOpen
                              : styles.dayToggleTrackClosed,
                          ]}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.dayToggleThumb,
                              open
                                ? styles.dayToggleThumbOpen
                                : styles.dayToggleThumbClosed,
                            ]}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Holiday / Temporary Closure Component */}
              <HolidayClosureCard
                merchantId={merchant?.id ? String(merchant.id) : undefined}
              />

              {/* Promote Listing CTA */}
              <View style={styles.promoteCard}>
                <View style={styles.promoteHeader}>
                  <View style={{ width: 28, alignItems: "center" }}>
                    <BoltIcon size={24} color={Colors.amber[500]} />
                  </View>
                  <View style={styles.promoteTextGroup}>
                    <Text style={styles.promoteTitle}>Promote Your Listing</Text>
                    <Text style={styles.promoteSub}>
                      Reach more local shoppers with a sponsored placement in the
                      For-You feed.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.promoteButton}
                  activeOpacity={0.85}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={styles.promoteButtonText}>Promote Listing</Text>
                    <RightArrowIcon size={16} color={Colors.white} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ height: 24 }} />
            </>
          )}
        </ScrollView>
      </View>

      {/* Edit Field Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editField}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon size={18} color={Colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                editField === "Description" && styles.modalTextArea,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editField?.toLowerCase()}`}
              placeholderTextColor={Colors.slate[400]}
              multiline={editField === "Description"}
              numberOfLines={editField === "Description" ? 3 : 1}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
                disabled={savingField}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveField}
                disabled={savingField}
              >
                {savingField ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.slate[50],
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  editModeLink: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  previewPillButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.teal[700],
    backgroundColor: Colors.teal[50],
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  previewScrollContent: {
    padding: 16,
  },
  previewCoverImage: {
    width: "100%",
    height: 180,
    borderRadius: Radius["2xl"],
    backgroundColor: Colors.slate[100],
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  previewMerchantName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 8,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  previewTagPill: {
    backgroundColor: Colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  previewRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[700],
  },
  previewDetailsBox: {
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
    gap: 10,
  },
  previewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewDetailItem: {
    fontSize: 13,
    color: Colors.slate[600],
    flex: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  coverPhotoContainer: {
    position: "relative",
    width: "100%",
    height: 140,
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: Colors.slate[100],
  },
  coverPhotoImage: {
    width: "100%",
    height: "100%",
  },
  changeCoverButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  changeCoverText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  galleryContainer: {
    gap: 8,
  },
  galleryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[700],
  },
  galleryRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  galleryImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
  },
  addGalleryButton: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.slate[200],
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[50],
  },
  fieldCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadows.sm,
  },
  fieldContent: {
    flex: 1,
    marginRight: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.slate[800],
  },
  editFieldLink: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  weeklyHoursHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  weeklyHoursTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  setAllLink: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  hoursList: {
    gap: 4,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  dayRowLast: {
    borderBottomWidth: 0,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[700],
    width: 44,
  },
  dayControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayHoursText: {
    fontSize: 12,
    color: Colors.slate[500],
  },
  dayClosedText: {
    fontSize: 12,
    color: Colors.slate[400],
    fontStyle: "italic",
  },
  dayToggleTrack: {
    width: 40,
    height: 22,
    borderRadius: Radius.full,
    padding: 2,
    justifyContent: "center",
  },
  dayToggleTrackOpen: {
    backgroundColor: Colors.teal[700],
  },
  dayToggleTrackClosed: {
    backgroundColor: Colors.slate[200],
  },
  dayToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  dayToggleThumbOpen: {
    alignSelf: "flex-end",
  },
  dayToggleThumbClosed: {
    alignSelf: "flex-start",
  },
  promoteCard: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    borderRadius: Radius["2xl"],
    padding: 16,
    gap: 14,
  },
  promoteHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  promoteTextGroup: {
    flex: 1,
  },
  promoteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.slate[800],
    marginBottom: 4,
  },
  promoteSub: {
    fontSize: 12,
    color: Colors.slate[600],
    lineHeight: 16,
  },
  promoteButton: {
    backgroundColor: Colors.amber[500],
    paddingVertical: 12,
    borderRadius: Radius.xl,
    alignItems: "center",
    ...Shadows.sm,
  },
  promoteButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.slate[900],
    backgroundColor: Colors.slate[50],
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  modalSaveButton: {
    backgroundColor: Colors.teal[700],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
});
