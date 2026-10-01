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
import { useRouter, useFocusEffect } from "expo-router";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  StarIcon,
  PlusIcon,
  ClockIcon,
  LocationIcon,
  TagIcon,
  CloseIcon,
  CheckIcon,
  MegaphoneIcon,
} from "../../src/components/icons/AppIcons";
import { HolidayClosureCard } from "../../src/components/common/HolidayClosureCard";
import { LocationPicker } from "../../src/components/common/LocationPicker";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  fetchMerchantByOwner,
  fetchMerchants,
  fetchCategories,
  updateMerchantDoc,
  fetchMerchantPosts,
  deleteMerchantPost,
  MerchantPost,
} from "../../src/services/firestoreService";
import {
  pickImageFromGallery,
  uploadImageAsync,
} from "../../src/services/storageService";
import { Merchant, OperatingHoursDay } from "../../src/types";
import { AddressPinState } from "../../src/hooks/useAddressPin";

const DAYS_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MerchantMyShop() {
  const router = useRouter();
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

  // Address pin state for the map picker in the Edit Address modal
  const [addressPin, setAddressPin] = useState<AddressPinState | null>(null);

  // Category list synced with Firestore interests collection
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Per-day hours state
  const [dayTimes, setDayTimes] = useState<{
    [key: string]: { openTime: string; closeTime: string };
  }>({});

  // Time editor modal state
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editCloseTime, setEditCloseTime] = useState("");

  // Posts state
  const [posts, setPosts] = useState<MerchantPost[]>([]);

  const loadMerchant = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);

      let m: Merchant | null = null;
      if (user?.uid) {
        m = await fetchMerchantByOwner(user.uid);
      }

      if (m) {
        setMerchant(m);
        if (m.weeklyHours) {
          const map: { [key: string]: boolean } = {};
          const times: { [key: string]: { openTime: string; closeTime: string } } = {};
          DAYS_KEYS.forEach((d) => {
            const dayKey = d.toLowerCase();
            const data = m?.weeklyHours?.[dayKey];
            map[d] = data ? !data.isClosed : d !== "Sun";
            times[d] = {
              openTime: data?.openTime || "07:00",
              closeTime: data?.closeTime || "21:00",
            };
          });
          setDayHours(map);
          setDayTimes(times);
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

  useEffect(() => {
    fetchCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats.filter((c) => c !== "All"));
      }
    });
  }, []);

  useEffect(() => {
    if (merchant?.id) {
      fetchMerchantPosts(String(merchant.id)).then(setPosts);
    }
  }, [merchant?.id]);

  useFocusEffect(
    useCallback(() => {
      if (merchant?.id) {
        fetchMerchantPosts(String(merchant.id)).then(setPosts);
      }
    }, [merchant?.id])
  );

  const handleChangeCover = async () => {
    if (!merchant) return;
    try {
      const uri = await pickImageFromGallery();
      if (!uri) return;

      setUploadingCover(true);
      console.log("[myshop] Starting cover upload for merchant:", merchant.id);
      const remotePath = `merchants/${merchant.id}/cover-${Date.now()}.jpg`;
      const downloadUrl = await uploadImageAsync(uri, remotePath);
      console.log("[myshop] Cover upload complete:", downloadUrl);

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
      console.log("[myshop] Starting gallery upload for merchant:", merchant.id);
      const remotePath = `merchants/${merchant.id}/gallery-${Date.now()}.jpg`;
      const downloadUrl = await uploadImageAsync(uri, remotePath);
      console.log("[myshop] Gallery upload complete:", downloadUrl);

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
          setAddressPin({
            label: merchant.address || "",
            lat: merchant.latitude || 0,
            lng: merchant.longitude || 0,
          });
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
          if (addressPin) {
            payload.latitude = addressPin.lat;
            payload.longitude = addressPin.lng;
          }
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
        const times = dayTimes[day] || { openTime: "07:00", closeTime: "21:00" };
        weeklyHoursRecord[day.toLowerCase()] = {
          openTime: times.openTime,
          closeTime: times.closeTime,
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

  const openTimeEditor = (day: string) => {
    const times = dayTimes[day] || { openTime: "07:00", closeTime: "21:00" };
    setEditingDay(day);
    setEditOpenTime(times.openTime);
    setEditCloseTime(times.closeTime);
    setTimeModalVisible(true);
  };

  const saveDayTimes = async () => {
    if (!merchant || !editingDay) return;
    const newTimes = {
      ...dayTimes,
      [editingDay]: { openTime: editOpenTime, closeTime: editCloseTime },
    };
    setDayTimes(newTimes);
    setTimeModalVisible(false);
    try {
      const weeklyHoursRecord: Record<string, OperatingHoursDay> = {};
      Object.entries(dayHours).forEach(([day, open]) => {
        const times = newTimes[day] || { openTime: "07:00", closeTime: "21:00" };
        weeklyHoursRecord[day.toLowerCase()] = {
          openTime: times.openTime,
          closeTime: times.closeTime,
          isClosed: !open,
        };
      });
      await updateMerchantDoc(String(merchant.id), {
        weeklyHours: weeklyHoursRecord,
      });
    } catch (err) {
      console.warn("saveDayTimes error:", err);
    }
  };



  const handleDeletePost = async (postId: string) => {
    if (!merchant) return;
    try {
      await deleteMerchantPost(String(merchant.id), postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("handleDeletePost error:", err);
      Alert.alert("Delete Failed", "Could not delete post.");
    }
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
            {merchant?.coverPhotoUrl || merchant?.img ? (
              <Image
                source={{
                  uri: merchant?.coverPhotoUrl || merchant?.img,
                }}
                style={styles.previewCoverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewCoverPlaceholder}>
                <Text style={styles.previewCoverPlaceholderText}>No cover photo</Text>
              </View>
            )}
            <View style={styles.previewCard}>
              <Text style={styles.previewMerchantName}>
                {merchant?.name || "Untitled Business"}
              </Text>
              <View style={styles.previewMetaRow}>
                <View style={styles.previewTagPill}>
                  <Text style={styles.previewTagText}>
                    {merchant?.category || "Uncategorized"}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <StarIcon size={14} color={Colors.amber[500]} />
                  <Text style={styles.previewRatingText}>
                    {merchant?.rating ?? 0} ({merchant?.reviews ?? 0})
                  </Text>
                </View>
              </View>

              <View style={styles.previewDetailsBox}>
                <View style={styles.previewDetailRow}>
                  <ClockIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.hours || "Hours not set"}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <LocationIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.address || "Address not set"}
                  </Text>
                </View>
                <View style={styles.previewDetailRow}>
                  <TagIcon size={16} color={Colors.slate[600]} />
                  <Text style={styles.previewDetailItem}>
                    {merchant?.description || "No description"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Posts Feed */}
            {posts.length > 0 && (
              <View style={styles.previewPostsSection}>
                <Text style={styles.previewPostsTitle}>Posts</Text>
                {posts.map((post) => (
                  <View key={post.id} style={styles.previewPostCard}>
                    {post.images && post.images.length > 1 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.previewMultiImageScroll}
                      >
                        {post.images.map((imgUri, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: imgUri }}
                            style={styles.previewCarouselImage}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    ) : post.image ? (
                      <Image
                        source={{ uri: post.image }}
                        style={styles.previewPostImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.previewPostBody}>
                      <Text style={styles.previewPostCaption}>{post.caption}</Text>
                      <Text style={styles.previewPostType}>
                        {post.isPromoted || post.type === "promo" ? "Promo" : "Post"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const galleryImages = merchant?.photos || [];

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
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : !merchant ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No business listing yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Complete your business setup to create your listing and manage it here.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/(auth)/merchant-setup")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyStateButtonText}>Set Up My Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Cover Photo & Gallery */}
              <View style={styles.card}>
                <View style={styles.coverPhotoContainer}>
                  {merchant?.coverPhotoUrl || merchant?.img ? (
                    <Image
                      source={{
                        uri: merchant?.coverPhotoUrl || merchant?.img,
                      }}
                      style={styles.coverPhotoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Text style={styles.coverPlaceholderText}>No cover photo</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.changeCoverButton}
                    onPress={handleChangeCover}
                    disabled={uploadingCover}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.changeCoverText}>Change</Text>
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
                      <PlusIcon size={20} color={Colors.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Promote Listing Card */}
              <View style={styles.promoteCard}>
                <View style={styles.promoteHeader}>
                  <View style={styles.promoteTextGroup}>
                    <Text style={styles.promoteTitle}>Promote Listing</Text>
                    <Text style={styles.promoteSub}>
                      Boost your visibility to local shoppers.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.promoteButton}
                  onPress={() =>
                    router.push({
                      pathname: "/(merchant)/create-post",
                      params: { isPromoted: "true" },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MegaphoneIcon size={14} color={Colors.white} />
                    <Text style={styles.promoteButtonText}>Promote Listing</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Current / Most Recent Post */}
              {posts.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.currentPostHeader}>
                    <Text style={styles.currentPostTitle}>Current Post</Text>
                    <TouchableOpacity
                      onPress={() => router.push("/(merchant)/create-post")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.currentPostEdit}>New Post</Text>
                    </TouchableOpacity>
                  </View>
                  {posts[0].images && posts[0].images.length > 1 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.currentPostMultiImageScroll}
                    >
                      {posts[0].images.map((imgUri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: imgUri }}
                          style={styles.currentPostCarouselImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  ) : posts[0].image ? (
                    <Image
                      source={{ uri: posts[0].image }}
                      style={styles.currentPostImage}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.currentPostBody}>
                    <Text style={styles.currentPostCaption}>{posts[0].caption}</Text>
                    <Text style={styles.currentPostType}>
                      {posts[0].isPromoted || posts[0].type === "promo" ? "Promo" : "Post"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Editable Fields */}
              {[
                {
                  label: "Business Name",
                  field: "Name" as const,
                  value: merchant?.name || "",
                },
                {
                  label: "Category",
                  field: "Category" as const,
                  value: merchant?.category || "",
                },
                {
                  label: "Description",
                  field: "Description" as const,
                  value: merchant?.description || "",
                },
                {
                  label: "Contact",
                  field: "Contact" as const,
                  value: merchant?.contact || "",
                },
                {
                  label: "Address",
                  field: "Address" as const,
                  value: merchant?.address || "",
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
                          <TouchableOpacity
                            onPress={() => openTimeEditor(day)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dayHoursText}>
                              {dayTimes[day]?.openTime || "07:00"} – {dayTimes[day]?.closeTime || "21:00"}
                            </Text>
                          </TouchableOpacity>
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

            {editField === "Category" ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.mapPickerLabel}>Select a category</Text>
                <ScrollView style={styles.categoryDropdown}>
                  {categoriesList.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        editValue === cat && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setEditValue(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          editValue === cat && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
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
                autoFocus={editField !== "Address"}
              />
            )}

            {editField === "Address" && addressPin && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.mapPickerLabel}>Set location on map</Text>
                <LocationPicker
                  initial={addressPin}
                  onChange={(state: AddressPinState) => {
                    setAddressPin(state);
                    setEditValue(state.label);
                  }}
                  mapHeight={200}
                />
              </View>
            )}

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

      {/* Time Editor Modal */}
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Hours — {editingDay}</Text>
              <TouchableOpacity
                onPress={() => setTimeModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon size={18} color={Colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <View style={styles.timeEditRow}>
              <View style={styles.timeEditCol}>
                <Text style={styles.timeEditLabel}>Opens at</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editOpenTime}
                  onChangeText={setEditOpenTime}
                  placeholder="09:00"
                  placeholderTextColor={Colors.slate[400]}
                />
              </View>
              <View style={styles.timeEditCol}>
                <Text style={styles.timeEditLabel}>Closes at</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editCloseTime}
                  onChangeText={setEditCloseTime}
                  placeholder="18:00"
                  placeholderTextColor={Colors.slate[400]}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setTimeModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveDayTimes}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[100],
  },
  coverPlaceholderText: {
    fontSize: 13,
    color: Colors.slate[400],
    fontWeight: "500",
  },
  previewCoverPlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: Radius["2xl"],
    backgroundColor: Colors.slate[100],
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCoverPlaceholderText: {
    fontSize: 13,
    color: Colors.slate[400],
    fontWeight: "500",
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 32,
    alignItems: "center",
    gap: 8,
    ...Shadows.md,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: Colors.slate[500],
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: Colors.teal[700],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.xl,
  },
  emptyStateButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
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
  mapPickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[500],
    marginBottom: 6,
  },
  categoryDropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[50],
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  categoryOptionSelected: {
    backgroundColor: Colors.teal[50],
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.slate[700],
  },
  categoryOptionTextSelected: {
    fontWeight: "700",
    color: Colors.teal[700],
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
  timeEditRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  timeEditCol: {
    flex: 1,
  },
  timeEditLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[500],
    marginBottom: 6,
  },
  postImagePicker: {
    height: 120,
    borderWidth: 2,
    borderColor: Colors.slate[200],
    borderStyle: "dashed",
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[50],
    marginBottom: 12,
    overflow: "hidden",
  },
  postImagePreview: {
    width: "100%",
    height: "100%",
  },
  postImagePickerText: {
    fontSize: 13,
    color: Colors.slate[400],
    fontWeight: "500",
  },
  postCaptionInput: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.slate[900],
    backgroundColor: Colors.slate[50],
    textAlignVertical: "top",
    height: 80,
  },
  previewPostsSection: {
    marginTop: 16,
    gap: 12,
  },
  previewPostsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  previewPostCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    overflow: "hidden",
    ...Shadows.sm,
  },
  previewPostImage: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.slate[100],
  },
  previewPostBody: {
    padding: 12,
  },
  previewPostCaption: {
    fontSize: 13,
    color: Colors.slate[800],
    lineHeight: 18,
  },
  previewPostType: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.teal[700],
    textTransform: "capitalize",
    marginTop: 4,
  },
  currentPostHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  currentPostTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  currentPostEdit: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
  },
  currentPostImage: {
    width: "100%",
    height: 140,
    borderRadius: Radius.xl,
    backgroundColor: Colors.slate[100],
    marginBottom: 12,
  },
  currentPostBody: {
    gap: 4,
  },
  currentPostCaption: {
    fontSize: 14,
    color: Colors.slate[800],
    lineHeight: 19,
  },
  currentPostType: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.teal[700],
    textTransform: "capitalize",
  },

  previewMultiImageScroll: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  previewCarouselImage: {
    width: 200,
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
  },
  currentPostMultiImageScroll: {
    gap: 8,
    marginBottom: 12,
  },
  currentPostCarouselImage: {
    width: 180,
    height: 130,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
  },
});
