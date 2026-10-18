import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  fetchAllMerchantsAdmin,
  setMerchantVerifiedAdmin,
  setMerchantSuspendedAdmin,
} from "../../src/services/firestoreService";
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  CheckIcon,
  BanIcon,
  EyeIcon,
  ChevronRight,
  ShopIcon,
} from "../../src/components/icons/AppIcons";

interface AdminMerchantRow {
  id: string;
  name: string;
  category: string;
  ownerId: string;
  isVerified: boolean;
  suspended: boolean;
  createdAt: any;
  address?: string;
  description?: string;
  coverPhotoUrl?: string;
}

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState<AdminMerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "suspended">("all");
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchantRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMerchants = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      const data = await fetchAllMerchantsAdmin();
      setMerchants(data);
    } catch (err) {
      console.warn("Admin merchants load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMerchants();
  }, [loadMerchants]);

  const filteredMerchants = useMemo(() => {
    let result = [...merchants];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.ownerId.toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case "verified":
        result = result.filter((m) => m.isVerified && !m.suspended);
        break;
      case "unverified":
        result = result.filter((m) => !m.isVerified && !m.suspended);
        break;
      case "suspended":
        result = result.filter((m) => m.suspended);
        break;
    }

    return result;
  }, [merchants, searchQuery, filter]);

  const openMerchantDetail = (merchant: AdminMerchantRow) => {
    setSelectedMerchant(merchant);
    setModalVisible(true);
  };

  const handleToggleVerified = async () => {
    if (!selectedMerchant) return;
    const newVerified = !selectedMerchant.isVerified;
    setActionLoading(true);
    try {
      const success = await setMerchantVerifiedAdmin(
        selectedMerchant.id,
        newVerified
      );
      if (success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === selectedMerchant.id ? { ...m, isVerified: newVerified } : m
          )
        );
        setSelectedMerchant((prev) =>
          prev ? { ...prev, isVerified: newVerified } : null
        );
      } else {
        Alert.alert("Error", "Failed to update verification status");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update verification status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspended = async () => {
    if (!selectedMerchant) return;
    const newSuspended = !selectedMerchant.suspended;
    setActionLoading(true);
    try {
      const success = await setMerchantSuspendedAdmin(
        selectedMerchant.id,
        newSuspended
      );
      if (success) {
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === selectedMerchant.id ? { ...m, suspended: newSuspended } : m
          )
        );
        setSelectedMerchant((prev) =>
          prev ? { ...prev, suspended: newSuspended } : null
        );
      } else {
        Alert.alert("Error", "Failed to update suspension status");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update suspension status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Merchants</Text>
          <Text style={styles.headerSubtitle}>
            {filteredMerchants.length} of {merchants.length} merchants
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <SearchIcon size={16} color={Colors.slate[400]} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, category, or owner..."
              placeholderTextColor={Colors.slate[400]}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <FilterIcon size={18} color={Colors.slate[600]} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "verified", label: "Verified" },
              { key: "unverified", label: "Unverified" },
              { key: "suspended", label: "Suspended" },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f.key && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Merchant List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMerchants(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : filteredMerchants.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No merchants found</Text>
            </View>
          ) : (
            filteredMerchants.map((merchant) => (
              <TouchableOpacity
                key={merchant.id}
                style={styles.merchantCard}
                onPress={() => openMerchantDetail(merchant)}
                activeOpacity={0.7}
              >
                <View style={styles.merchantCardLeft}>
                  <View style={styles.merchantAvatar}>
                    <ShopIcon size={20} color={Colors.teal[700]} />
                  </View>
                  <View style={styles.merchantInfo}>
                    <View style={styles.merchantNameRow}>
                      <Text style={styles.merchantName}>{merchant.name}</Text>
                      {merchant.suspended && (
                        <View style={styles.suspendedBadge}>
                          <BanIcon size={10} color={Colors.rose[600]} />
                          <Text style={styles.suspendedBadgeText}>Suspended</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.merchantCategory}>
                      {merchant.category} · {merchant.ownerId.slice(0, 8)}...
                    </Text>
                  </View>
                </View>
                <View style={styles.merchantCardRight}>
                  {merchant.isVerified ? (
                    <View style={styles.verifiedBadge}>
                      <CheckIcon size={10} color={Colors.emerald[700]} />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  ) : (
                    <View style={styles.unverifiedBadge}>
                      <Text style={styles.unverifiedBadgeText}>Unverified</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={Colors.slate[300]} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Merchant Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMerchant && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Merchant Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <CloseIcon size={20} color={Colors.slate[500]} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Merchant Image */}
                  {selectedMerchant.coverPhotoUrl ? (
                    <Image
                      source={{ uri: selectedMerchant.coverPhotoUrl }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <ShopIcon size={32} color={Colors.slate[300]} />
                    </View>
                  )}

                  {/* Merchant Info */}
                  <View style={styles.modalMerchantInfo}>
                    <Text style={styles.modalMerchantName}>
                      {selectedMerchant.name}
                    </Text>
                    <Text style={styles.modalMerchantCategory}>
                      {selectedMerchant.category}
                    </Text>
                    {selectedMerchant.address && (
                      <Text style={styles.modalMerchantAddress}>
                        {selectedMerchant.address}
                      </Text>
                    )}
                    <Text style={styles.modalMerchantOwner}>
                      Owner: {selectedMerchant.ownerId}
                    </Text>
                  </View>

                  {/* Status Badges */}
                  <View style={styles.modalStatusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedMerchant.isVerified
                          ? styles.statusBadgeVerified
                          : styles.statusBadgeUnverified,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedMerchant.isVerified
                            ? styles.statusBadgeTextVerified
                            : styles.statusBadgeTextUnverified,
                        ]}
                      >
                        {selectedMerchant.isVerified ? "Verified" : "Unverified"}
                      </Text>
                    </View>
                    {selectedMerchant.suspended && (
                      <View style={styles.statusBadgeSuspended}>
                        <BanIcon size={12} color={Colors.rose[600]} />
                        <Text style={styles.statusBadgeTextSuspended}>Suspended</Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  {selectedMerchant.description ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Description</Text>
                      <Text style={styles.modalDescription}>
                        {selectedMerchant.description}
                      </Text>
                    </View>
                  ) : null}

                  {/* Actions */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Actions</Text>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        selectedMerchant.isVerified
                          ? styles.actionButtonUnverify
                          : styles.actionButtonVerify,
                      ]}
                      onPress={handleToggleVerified}
                      disabled={actionLoading}
                    >
                      {selectedMerchant.isVerified ? (
                        <>
                          <BanIcon size={16} color={Colors.white} />
                          <Text style={styles.actionButtonText}>
                            Remove Verification
                          </Text>
                        </>
                      ) : (
                        <>
                          <CheckIcon size={16} color={Colors.white} />
                          <Text style={styles.actionButtonText}>
                            Verify Merchant
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        selectedMerchant.suspended
                          ? styles.actionButtonActivate
                          : styles.actionButtonSuspend,
                      ]}
                      onPress={handleToggleSuspended}
                      disabled={actionLoading}
                    >
                      {selectedMerchant.suspended ? (
                        <>
                          <CheckIcon size={16} color={Colors.white} />
                          <Text style={styles.actionButtonText}>
                            Unsuspend Merchant
                          </Text>
                        </>
                      ) : (
                        <>
                          <BanIcon size={16} color={Colors.white} />
                          <Text style={styles.actionButtonText}>
                            Suspend Merchant
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
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
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.slate[800],
    paddingVertical: 0,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
  },
  chipActive: {
    backgroundColor: Colors.teal[700],
    borderColor: Colors.teal[700],
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  chipTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.slate[400],
  },
  merchantCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadows.sm,
  },
  merchantCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  merchantAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  merchantInfo: {
    flex: 1,
  },
  merchantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  suspendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.rose[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  suspendedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.rose[600],
  },
  merchantCategory: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  merchantCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.emerald[700],
  },
  unverifiedBadge: {
    backgroundColor: Colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  unverifiedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.slate[500],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius["3xl"],
    borderTopRightRadius: Radius["3xl"],
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  modalImage: {
    width: "100%",
    height: 160,
    borderRadius: Radius.xl,
    backgroundColor: Colors.slate[100],
  },
  modalImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: Radius.xl,
    backgroundColor: Colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
  },
  modalMerchantInfo: {
    marginTop: 16,
    marginBottom: 12,
  },
  modalMerchantName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  modalMerchantCategory: {
    fontSize: 13,
    color: Colors.slate[500],
    marginTop: 2,
  },
  modalMerchantAddress: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 4,
  },
  modalMerchantOwner: {
    fontSize: 11,
    color: Colors.slate[400],
    marginTop: 4,
  },
  modalStatusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeVerified: {
    backgroundColor: Colors.emerald[50],
  },
  statusBadgeUnverified: {
    backgroundColor: Colors.slate[100],
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadgeTextVerified: {
    color: Colors.emerald[700],
  },
  statusBadgeTextUnverified: {
    color: Colors.slate[500],
  },
  statusBadgeSuspended: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.rose[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgeTextSuspended: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.rose[600],
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.slate[700],
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: Colors.slate[600],
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    marginBottom: 10,
  },
  actionButtonVerify: {
    backgroundColor: Colors.emerald[600],
  },
  actionButtonUnverify: {
    backgroundColor: Colors.amber[600],
  },
  actionButtonSuspend: {
    backgroundColor: Colors.rose[600],
  },
  actionButtonActivate: {
    backgroundColor: Colors.teal[600],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});
