import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
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
  fetchAllFlagReportsAdmin,
  resolveFlagReportAdmin,
} from "../../src/services/firestoreService";
import {
  FlagIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  EyeIcon,
  ChevronRight,
  ClockIcon,
  LocationIcon,
  PhoneIcon,
  ImageIcon,
} from "../../src/components/icons/AppIcons";

interface AdminFlagReport {
  id: string;
  merchantId: string;
  reporter: string;
  reporterId: string;
  issue: string;
  detail: string;
  time: string;
  resolved: boolean;
  status: string;
  resolutionAction: string | null;
  createdAt: any;
}

type StatusFilter = "all" | "pending" | "resolved";

export default function AdminReports() {
  const [reports, setReports] = useState<AdminFlagReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedReport, setSelectedReport] = useState<AdminFlagReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadReports = useCallback(async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      const data = await fetchAllFlagReportsAdmin();
      setReports(data);
    } catch (err) {
      console.warn("Admin reports load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const pendingCount = useMemo(
    () => reports.filter((r) => r.status === "pending").length,
    [reports]
  );

  const openReportDetail = (report: AdminFlagReport) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const handleResolve = async (action: "confirmed_correct" | "updated_hours" | "dismissed") => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const success = await resolveFlagReportAdmin(selectedReport.id, action);
      if (success) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === selectedReport.id
              ? { ...r, status: "resolved", resolved: true, resolutionAction: action }
              : r
          )
        );
        setModalVisible(false);
        setSelectedReport(null);
      } else {
        Alert.alert("Error", "Failed to resolve report");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to resolve report");
    } finally {
      setActionLoading(false);
    }
  };

  const getIssueIcon = (issue: string): React.ReactNode => {
    const lower = issue.toLowerCase();
    if (lower.includes("hour") || lower.includes("time")) {
      return <ClockIcon size={18} color={Colors.amber[700]} />;
    }
    if (lower.includes("location") || lower.includes("address")) {
      return <LocationIcon size={18} color={Colors.teal[700]} />;
    }
    if (lower.includes("phone") || lower.includes("contact")) {
      return <PhoneIcon size={18} color={Colors.teal[700]} />;
    }
    if (lower.includes("image") || lower.includes("photo")) {
      return <ImageIcon size={18} color={Colors.slate[600]} />;
    }
    return <AlertTriangleIcon size={18} color={Colors.rose[500]} />;
  };

  const getResolutionLabel = (action: string) => {
    switch (action) {
      case "confirmed_correct":
        return "Confirmed Correct";
      case "updated_hours":
        return "Updated Hours";
      case "dismissed":
        return "Dismissed";
      default:
        return action;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Flag Reports</Text>
            <Text style={styles.headerSubtitle}>
              {pendingCount} pending · {reports.length} total
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <FlagIcon size={16} color={Colors.rose[600]} />
            <Text style={styles.headerBadgeText}>{pendingCount}</Text>
          </View>
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "resolved", label: "Resolved" },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, statusFilter === f.key && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  statusFilter === f.key && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reports List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReports(true)}
              tintColor={Colors.teal[600]}
              colors={[Colors.teal[600]]}
            />
          }
        >
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.teal[600]} />
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <FlagIcon size={32} color={Colors.slate[300]} />
              <Text style={styles.emptyText}>
                {statusFilter === "pending"
                  ? "No pending reports"
                  : statusFilter === "resolved"
                  ? "No resolved reports"
                  : "No reports yet"}
              </Text>
            </View>
          ) : (
            filteredReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                onPress={() => openReportDetail(report)}
                activeOpacity={0.7}
              >
                <View style={styles.reportCardLeft}>
                  <View style={styles.issueIcon}>
                    {getIssueIcon(report.issue)}
                  </View>
                  <View style={styles.reportInfo}>
                    <View style={styles.reportTitleRow}>
                      <Text style={styles.reportIssue}>{report.issue}</Text>
                      <View
                        style={[
                          styles.statusDot,
                          report.status === "pending"
                            ? styles.statusDotPending
                            : styles.statusDotResolved,
                        ]}
                      />
                    </View>
                    <Text style={styles.reportMerchant}>
                      Merchant: {report.merchantId.slice(0, 12)}...
                    </Text>
                    <Text style={styles.reportMeta}>
                      by {report.reporter} · {report.time}
                    </Text>
                  </View>
                </View>
                <View style={styles.reportCardRight}>
                  {report.status === "resolved" && report.resolutionAction && (
                    <View style={styles.resolvedBadge}>
                      <CheckIcon size={10} color={Colors.emerald[700]} />
                      <Text style={styles.resolvedBadgeText}>
                        {getResolutionLabel(report.resolutionAction)}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={Colors.slate[300]} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Report Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <CloseIcon size={20} color={Colors.slate[500]} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Issue Type */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Issue Type</Text>
                    <View style={styles.issueTypeCard}>
                      <View style={styles.issueTypeIcon}>
                        {getIssueIcon(selectedReport.issue)}
                      </View>
                      <Text style={styles.issueTypeText}>
                        {selectedReport.issue}
                      </Text>
                    </View>
                  </View>

                  {/* Detail */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Detail</Text>
                    <Text style={styles.modalDetailText}>
                      {selectedReport.detail || "No additional details provided."}
                    </Text>
                  </View>

                  {/* Reporter Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Reporter</Text>
                    <View style={styles.reporterCard}>
                      <View style={styles.reporterAvatar}>
                        <Text style={styles.reporterAvatarText}>
                          {selectedReport.reporter
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reporterName}>
                          {selectedReport.reporter}
                        </Text>
                        <Text style={styles.reporterId}>
                          ID: {selectedReport.reporterId}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Merchant Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Reported Merchant</Text>
                    <View style={styles.merchantCard}>
                      <Text style={styles.merchantId}>
                        ID: {selectedReport.merchantId}
                      </Text>
                      <Text style={styles.reportTime}>
                        Reported {selectedReport.time}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Status</Text>
                    <View
                      style={[
                        styles.statusCard,
                        selectedReport.status === "pending"
                          ? styles.statusCardPending
                          : styles.statusCardResolved,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusCardText,
                          selectedReport.status === "pending"
                            ? styles.statusCardTextPending
                            : styles.statusCardTextResolved,
                        ]}
                      >
                        {selectedReport.status === "pending"
                          ? "Pending Review"
                          : `Resolved — ${getResolutionLabel(
                              selectedReport.resolutionAction || ""
                            )}`}
                      </Text>
                    </View>
                  </View>

                  {/* Resolve Actions (only for pending) */}
                  {selectedReport.status === "pending" && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>
                        Resolve Report
                      </Text>

                      <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => handleResolve("confirmed_correct")}
                        disabled={actionLoading}
                      >
                        <CheckIcon size={16} color={Colors.white} />
                        <Text style={styles.resolveButtonText}>
                          Confirm Information is Correct
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resolveButton, styles.resolveButtonSecondary]}
                        onPress={() => handleResolve("updated_hours")}
                        disabled={actionLoading}
                      >
                        <CheckIcon size={16} color={Colors.white} />
                        <Text style={styles.resolveButtonText}>
                          Hours Updated
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resolveButton, styles.resolveButtonDanger]}
                        onPress={() => handleResolve("dismissed")}
                        disabled={actionLoading}
                      >
                        <CloseIcon size={16} color={Colors.white} />
                        <Text style={styles.resolveButtonText}>
                          Dismiss Report
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.rose[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.rose[600],
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.slate[400],
  },
  reportCard: {
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
  reportCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  issueIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.amber[50],
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reportIssue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  statusDotPending: {
    backgroundColor: Colors.amber[500],
  },
  statusDotResolved: {
    backgroundColor: Colors.emerald[500],
  },
  reportMerchant: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 2,
  },
  reportMeta: {
    fontSize: 11,
    color: Colors.slate[400],
    marginTop: 1,
  },
  reportCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  resolvedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.emerald[700],
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
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.slate[700],
    marginBottom: 8,
  },
  issueTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.amber[50],
    borderRadius: Radius.xl,
    padding: 14,
  },
  issueTypeIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  issueTypeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.amber[800],
  },
  modalDetailText: {
    fontSize: 14,
    color: Colors.slate[700],
    lineHeight: 20,
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
  },
  reporterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
  },
  reporterAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  reporterAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.teal[700],
  },
  reporterName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[800],
  },
  reporterId: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 2,
  },
  merchantCard: {
    backgroundColor: Colors.slate[50],
    borderRadius: Radius.xl,
    padding: 14,
  },
  merchantId: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[700],
  },
  reportTime: {
    fontSize: 12,
    color: Colors.slate[500],
    marginTop: 4,
  },
  statusCard: {
    borderRadius: Radius.xl,
    padding: 14,
    alignItems: "center",
  },
  statusCardPending: {
    backgroundColor: Colors.amber[50],
  },
  statusCardResolved: {
    backgroundColor: Colors.emerald[50],
  },
  statusCardText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusCardTextPending: {
    color: Colors.amber[800],
  },
  statusCardTextResolved: {
    color: Colors.emerald[800],
  },
  resolveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.emerald[600],
    marginBottom: 10,
  },
  resolveButtonSecondary: {
    backgroundColor: Colors.teal[600],
  },
  resolveButtonDanger: {
    backgroundColor: Colors.rose[600],
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});
