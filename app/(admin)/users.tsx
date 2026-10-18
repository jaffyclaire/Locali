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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import {
  fetchAllUsersAdmin,
  updateUserRoleAdmin,
  setUserDisabledAdmin,
  getUserSavedCount,
  getUserMerchantListing,
} from "../../src/services/firestoreService";
import { AdminUser } from "../../src/types";
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  BanIcon,
  CheckIcon,
  EyeIcon,
  ChevronRight,
} from "../../src/components/icons/AppIcons";

const ROLE_OPTIONS = ["shopper", "merchant_owner", "admin"];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userSavedCount, setUserSavedCount] = useState(0);
  const [userHasListing, setUserHasListing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      const data = await fetchAllUsersAdmin();
      setUsers(data);
    } catch (err) {
      console.warn("Admin users load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    return result;
  }, [users, searchQuery, roleFilter]);

  const openUserDetail = async (user: AdminUser) => {
    setSelectedUser(user);
    setModalVisible(true);
    try {
      const [savedCount, listing] = await Promise.all([
        getUserSavedCount(user.uid),
        getUserMerchantListing(user.uid),
      ]);
      setUserSavedCount(savedCount);
      setUserHasListing(Boolean(listing));
    } catch (err) {
      console.warn("Error loading user detail:", err);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const success = await updateUserRoleAdmin(selectedUser.uid, newRole);
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === selectedUser.uid ? { ...u, role: newRole as any } : u
          )
        );
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as any } : null));
      } else {
        Alert.alert("Error", "Failed to update role");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDisabled = async () => {
    if (!selectedUser) return;
    const newDisabled = !selectedUser.disabled;
    setActionLoading(true);
    try {
      const success = await setUserDisabledAdmin(selectedUser.uid, newDisabled);
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === selectedUser.uid ? { ...u, disabled: newDisabled } : u
          )
        );
        setSelectedUser((prev) =>
          prev ? { ...prev, disabled: newDisabled } : null
        );
      } else {
        Alert.alert("Error", "Failed to update user status");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return { bg: Colors.rose[50], text: Colors.rose[700] };
      case "merchant_owner":
        return { bg: Colors.teal[50], text: Colors.teal[700] };
      default:
        return { bg: Colors.slate[100], text: Colors.slate[600] };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Users</Text>
          <Text style={styles.headerSubtitle}>
            {filteredUsers.length} of {users.length} users
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
              placeholder="Search by name or email..."
              placeholderTextColor={Colors.slate[400]}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <FilterIcon size={18} color={Colors.slate[600]} />
          </TouchableOpacity>
        </View>

        {/* Role Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {["all", "shopper", "merchant_owner", "admin"].map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.chip,
                roleFilter === role && styles.chipActive,
              ]}
              onPress={() => setRoleFilter(role)}
            >
              <Text
                style={[
                  styles.chipText,
                  roleFilter === role && styles.chipTextActive,
                ]}
              >
                {role === "all" ? "All" : role === "merchant_owner" ? "Merchants" : role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* User List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUsers(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            filteredUsers.map((user) => {
              const badgeColor = getRoleBadgeColor(user.role);
              return (
                <TouchableOpacity
                  key={user.uid}
                  style={styles.userCard}
                  onPress={() => openUserDetail(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userCardLeft}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        {user.disabled && (
                          <View style={styles.disabledBadge}>
                            <BanIcon size={10} color={Colors.rose[600]} />
                            <Text style={styles.disabledBadgeText}>Suspended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                  </View>
                  <View style={styles.userCardRight}>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: badgeColor.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: badgeColor.text },
                        ]}
                      >
                        {user.role === "merchant_owner"
                          ? "Merchant"
                          : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={Colors.slate[300]} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* User Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>User Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <CloseIcon size={20} color={Colors.slate[500]} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* User Info */}
                  <View style={styles.modalUserSection}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {selectedUser.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalUserName}>
                      {selectedUser.fullName}
                    </Text>
                    <Text style={styles.modalUserEmail}>
                      {selectedUser.email}
                    </Text>
                    {selectedUser.disabled && (
                      <View style={styles.modalDisabledBadge}>
                        <BanIcon size={12} color={Colors.rose[600]} />
                        <Text style={styles.modalDisabledText}>Account Suspended</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats */}
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatValue}>{userSavedCount}</Text>
                      <Text style={styles.modalStatLabel}>Saved Merchants</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatValue}>
                        {userHasListing ? "Yes" : "No"}
                      </Text>
                      <Text style={styles.modalStatLabel}>Has Listing</Text>
                    </View>
                  </View>

                  {/* Role Selection */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Role</Text>
                    <View style={styles.roleOptions}>
                      {ROLE_OPTIONS.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            selectedUser.role === role && styles.roleOptionActive,
                          ]}
                          onPress={() => handleRoleChange(role)}
                          disabled={actionLoading}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              selectedUser.role === role &&
                                styles.roleOptionTextActive,
                            ]}
                          >
                            {role === "merchant_owner"
                              ? "Merchant"
                              : role.charAt(0).toUpperCase() + role.slice(1)}
                          </Text>
                          {selectedUser.role === role && (
                            <CheckIcon size={14} color={Colors.teal[700]} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Suspend/Activate */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Account Status</Text>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        selectedUser.disabled
                          ? styles.statusButtonActivate
                          : styles.statusButtonSuspend,
                      ]}
                      onPress={handleToggleDisabled}
                      disabled={actionLoading}
                    >
                      {selectedUser.disabled ? (
                        <>
                          <CheckIcon size={16} color={Colors.white} />
                          <Text style={styles.statusButtonText}>Activate Account</Text>
                        </>
                      ) : (
                        <>
                          <BanIcon size={16} color={Colors.white} />
                          <Text style={styles.statusButtonText}>Suspend Account</Text>
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
  userCard: {
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
  userCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  disabledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.rose[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  disabledBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.rose[600],
  },
  userEmail: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  userCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
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
    maxHeight: "80%",
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
  modalUserSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  modalUserEmail: {
    fontSize: 13,
    color: Colors.slate[500],
    marginTop: 2,
  },
  modalDisabledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.rose[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 8,
  },
  modalDisabledText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.rose[600],
  },
  modalStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
    alignItems: "center",
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.slate[900],
  },
  modalStatLabel: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.slate[700],
    marginBottom: 10,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    backgroundColor: Colors.white,
  },
  roleOptionActive: {
    borderColor: Colors.teal[700],
    backgroundColor: Colors.teal[50],
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  roleOptionTextActive: {
    color: Colors.teal[700],
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
  },
  statusButtonSuspend: {
    backgroundColor: Colors.rose[600],
  },
  statusButtonActivate: {
    backgroundColor: Colors.emerald[600],
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});
