import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { PhotoUploadIcon, LocationIcon, CheckIcon } from "../../src/components/icons/AppIcons";
import { fetchCategories, createMerchantDoc } from "../../src/services/firestoreService";
import { pickImageFromGallery, uploadImageAsync } from "../../src/services/storageService";
import { LocationPicker } from "../../src/components/common/LocationPicker";
import { AddressPinState } from "../../src/hooks/useAddressPin";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_CATEGORIES = [
  "Auto Services",
  "Bakery",
  "Bookstore",
  "Clothing & Boutique",
  "Coffee",
  "Electronics",
  "Fast Food",
  "Fitness & Gym",
  "Groceries",
  "Health & Wellness",
  "Home Goods",
  "Other",
  "Pet Services",
  "Pharmacy",
  "Restaurant",
  "Retail",
  "Salon & Barber",
];

export default function MerchantSetupScreen() {
  const router = useRouter();
  const { user, signIn } = useAuthRole();
  const [step, setStep] = useState(1);

  // Categories list synced with Firestore
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    fetchCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats.filter((c) => c !== "All"));
      }
    });
  }, []);

  // Step 1 state
  const [businessName, setBusinessName] = useState("Brew & Co.");
  const [description, setDescription] = useState("Specialty coffee in downtown");
  const [phone, setPhone] = useState("+1 (555) 000-0000");
  const [category, setCategory] = useState("Coffee");

  // Step 2 state
  const [address, setAddress] = useState("12 Market St, Downtown, SF");
  const [pinCoord, setPinCoord] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
  });

  // Step 3 state
  const [activeDays, setActiveDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const toggleDay = (d: string) => {
    setActiveDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handlePickCover = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setCoverImageUri(uri);
    }
  };

  const handleFinish = async () => {
    setIsUploading(true);
    try {
      let coverPhotoUrl = "";
      if (coverImageUri) {
        const path = `merchants/${user?.uid || "new"}/cover_${Date.now()}.jpg`;
        coverPhotoUrl = await uploadImageAsync(coverImageUri, path);
      }

      const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weeklyHours = Object.fromEntries(
        allDays.map((d) => [
          d,
          activeDays.includes(d)
            ? { openTime, closeTime, isClosed: false }
            : { openTime: "", closeTime: "", isClosed: true },
        ])
      );

      await createMerchantDoc({
        ownerId: user?.uid || "",
        name: businessName,
        description,
        contact: phone,
        category,
        address,
        latitude: pinCoord.latitude,
        longitude: pinCoord.longitude,
        coverPhotoUrl:
          coverPhotoUrl ||
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=200&fit=crop&auto=format",
        isOpen: true,
        rating: 5.0,
        ratingCount: 1,
        weeklyHours,
        photos: coverPhotoUrl ? [coverPhotoUrl] : [],
      });

      signIn("merchant");
      router.replace("/(merchant)/dashboard");
    } catch (err) {
      console.error("Error creating merchant document:", err);
      signIn("merchant");
      router.replace("/(merchant)/dashboard");
    } finally {
      setIsUploading(false);
    }
  };

  const StepDot = ({ n }: { n: number }) => {
    const isCurrent = step === n;
    const isCompleted = step > n;
    return (
      <View
        style={[
          styles.stepDot,
          isCurrent && styles.stepDotCurrent,
          isCompleted && styles.stepDotCompleted,
        ]}
      >
        {isCompleted ? (
          <CheckIcon size={12} color={Colors.white} />
        ) : (
          <Text
            style={[
              styles.stepDotText,
              (isCurrent || isCompleted) && styles.stepDotTextActive,
            ]}
          >
            {n}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepProgressRow}>
            <StepDot n={1} />
            <View
              style={[
                styles.stepLine,
                step > 1 ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
            <StepDot n={2} />
            <View
              style={[
                styles.stepLine,
                step > 2 ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
            <StepDot n={3} />
          </View>

          <Text style={styles.headerTitle}>
            {step === 1
              ? "Business Details"
              : step === 2
              ? "Location & Map Pin"
              : "Storefront & Hours"}
          </Text>
          <Text style={styles.headerSubtitle}>Step {step} of 3</Text>
        </View>

        {/* Form Body */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Brew & Co."
                  placeholderTextColor={Colors.slate[400]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short Description</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What makes your shop special?"
                  placeholderTextColor={Colors.slate[400]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={Colors.slate[400]}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.categorySection}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryPills}>
                  {categoriesList.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCategory(c)}
                      style={[
                        styles.categoryPill,
                        category === c && styles.categoryPillSelected,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          category === c && styles.categoryPillTextSelected,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.mapPinSection}>
                <Text style={styles.inputLabel}>Business Address & Location</Text>
                <LocationPicker
                  initial={
                    address
                      ? { label: address, lat: pinCoord.latitude, lng: pinCoord.longitude }
                      : null
                  }
                  onChange={(state: AddressPinState) => {
                    setAddress(state.label);
                    setPinCoord({ latitude: state.lat, longitude: state.lng });
                  }}
                  mapHeight={240}
                />
                <Text style={styles.mapFootnote}>
                  Location saved to your listing
                </Text>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              {/* Cover Photo Upload */}
              <View style={styles.uploadGroup}>
                <Text style={styles.inputLabel}>Cover Photo</Text>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={handlePickCover}
                  activeOpacity={0.8}
                >
                  {coverImageUri ? (
                    <View style={styles.previewImageContainer}>
                      <Image
                        source={{ uri: coverImageUri }}
                        style={styles.coverPreviewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.changeOverlay}>
                        <Text style={styles.changeOverlayText}>Tap to change photo</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.uploadIconCircle}>
                        <PhotoUploadIcon size={22} color={Colors.teal[700]} />
                      </View>
                      <Text style={styles.uploadTitle}>
                        Tap to upload from gallery
                      </Text>
                      <Text style={styles.uploadSubtitle}>
                        Stored in Firebase Storage
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Operating Days */}
              <View style={styles.daysGroup}>
                <Text style={styles.inputLabel}>Operating Days</Text>
                <View style={styles.daysRow}>
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleDay(d)}
                      style={[
                        styles.dayButton,
                        activeDays.includes(d) && styles.dayButtonActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          activeDays.includes(d) && styles.dayButtonTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Times */}
              <View style={styles.timesRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.inputLabel}>Opens at</Text>
                  <TextInput
                    style={styles.input}
                    value={openTime}
                    onChangeText={setOpenTime}
                    placeholder="09:00"
                    placeholderTextColor={Colors.slate[400]}
                  />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.inputLabel}>Closes at</Text>
                  <TextInput
                    style={styles.input}
                    value={closeTime}
                    onChangeText={setCloseTime}
                    placeholder="18:00"
                    placeholderTextColor={Colors.slate[400]}
                  />
                </View>
              </View>

              {/* Preview Card */}
              <View style={styles.hoursPreviewCard}>
                <Text style={styles.previewTitle}>Hours preview</Text>
                <Text style={styles.previewDays}>
                  {activeDays.length > 0 ? activeDays.join(", ") : "No days selected"}
                </Text>
                <Text style={styles.previewHours}>
                  {openTime} – {closeTime}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setStep((s) => s + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.publishButton, isUploading && { opacity: 0.7 }]}
              onPress={handleFinish}
              disabled={isUploading}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.publishButtonText}>Publish Listing</Text>
                  <CheckIcon size={16} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          )}

          {step > 1 && (
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={() => setStep((s) => s - 1)}
            >
              <Text style={styles.backStepText}>← Back</Text>
            </TouchableOpacity>
          )}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[100],
  },
  stepProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotCurrent: {
    backgroundColor: Colors.teal[700],
  },
  stepDotCompleted: {
    backgroundColor: Colors.emerald[500],
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.slate[400],
  },
  stepDotTextActive: {
    color: Colors.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
  },
  stepLineActive: {
    backgroundColor: Colors.emerald[400],
  },
  stepLineInactive: {
    backgroundColor: Colors.slate[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.slate[900],
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  stepContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[500],
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.slate[900],
    backgroundColor: Colors.white,
  },
  categorySection: {
    marginTop: 4,
  },
  categoryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.slate[100],
  },
  categoryPillSelected: {
    backgroundColor: Colors.teal[700],
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  categoryPillTextSelected: {
    color: Colors.white,
  },
  mapPinSection: {
    gap: 6,
  },
  mapWrapper: {
    flex: 1,
    minHeight: 200,
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  customPin: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.md,
  },
  dragHintBadge: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  dragHintText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  addressErrorText: {
    fontSize: 11,
    color: Colors.rose[600],
    marginTop: 4,
    fontWeight: "500",
  },
  mapFootnote: {
    fontSize: 11,
    color: Colors.slate[400],
    textAlign: "center",
    marginTop: 8,
  },
  uploadGroup: {
    marginBottom: 4,
  },
  uploadBox: {
    height: 120,
    borderWidth: 2,
    borderColor: Colors.slate[200],
    borderStyle: "dashed",
    borderRadius: Radius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[50],
    gap: 6,
    overflow: "hidden",
  },
  previewImageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  coverPreviewImage: {
    width: "100%",
    height: "100%",
  },
  changeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 5,
    alignItems: "center",
  },
  changeOverlayText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  uploadIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontSize: 12,
    color: Colors.slate[500],
    fontWeight: "500",
  },
  uploadSubtitle: {
    fontSize: 10,
    color: Colors.slate[400],
  },
  daysGroup: {
    marginTop: 6,
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate[100],
    alignItems: "center",
  },
  dayButtonActive: {
    backgroundColor: Colors.teal[700],
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[500],
  },
  dayButtonTextActive: {
    color: Colors.white,
  },
  timesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  timeCol: {
    flex: 1,
  },
  hoursPreviewCard: {
    backgroundColor: Colors.slate[50],
    borderWidth: 1,
    borderColor: Colors.slate[100],
    borderRadius: Radius.xl,
    padding: 14,
    marginTop: 6,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate[500],
    marginBottom: 4,
  },
  previewDays: {
    fontSize: 13,
    color: Colors.slate[800],
  },
  previewHours: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.teal[700],
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.slate[100],
    backgroundColor: Colors.white,
  },
  continueButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  publishButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  publishButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  backStepButton: {
    alignItems: "center",
    paddingTop: 12,
  },
  backStepText: {
    color: Colors.slate[400],
    fontSize: 13,
  },
});
