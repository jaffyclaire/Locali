import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { saveMerchantHolidayClosure } from "../../services/firestoreService";
import { CheckIcon } from "../icons/AppIcons";

interface HolidayClosureCardProps {
  merchantId?: string;
}

export const HolidayClosureCard: React.FC<HolidayClosureCardProps> = ({ merchantId }) => {
  const [enabled, setEnabled] = useState(false);
  const [startDate, setStartDate] = useState("2026-10-31");
  const [endDate, setEndDate] = useState("2026-11-01");
  const [notice, setNotice] = useState("Closed for Public Holiday");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (merchantId) {
      await saveMerchantHolidayClosure(merchantId, { startDate, endDate, notice });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Temporary / Holiday Closure</Text>
          <Text style={styles.subtitle}>Notify customers of planned closures</Text>
        </View>
        <TouchableOpacity
          onPress={() => setEnabled((e) => !e)}
          style={[
            styles.toggleTrack,
            enabled ? styles.toggleTrackActive : styles.toggleTrackInactive,
          ]}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.toggleThumb,
              enabled ? styles.toggleThumbActive : styles.toggleThumbInactive,
            ]}
          />
        </TouchableOpacity>
      </View>

      {enabled && (
        <View style={styles.body}>
          <Text style={styles.fieldSectionTitle}>Date Range Closed</Text>
          <View style={styles.dateInputsRow}>
            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.amber[400]}
              />
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.inputLabel}>To</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.amber[400]}
              />
            </View>
          </View>

          <View style={styles.noticeSection}>
            <Text style={styles.inputLabel}>
              Customer Notice{" "}
              <Text style={styles.optionalText}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notice}
              onChangeText={setNotice}
              placeholder="e.g. Closed for Public Holiday"
              placeholderTextColor={Colors.amber[400]}
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saved ? styles.saveButtonSuccess : styles.saveButtonNormal,
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            {saved ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CheckIcon size={14} color={Colors.white} />
                <Text style={styles.saveButtonText}>Saved!</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.amber[50],
    borderWidth: 1,
    borderColor: Colors.amber[200],
    borderRadius: Radius.xl,
    padding: 16,
    marginTop: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.amber[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.amber[700],
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
    backgroundColor: Colors.amber[700],
  },
  toggleTrackInactive: {
    backgroundColor: Colors.amber[200],
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
  body: {
    marginTop: 14,
  },
  fieldSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.amber[800],
    marginBottom: 6,
  },
  dateInputsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  dateCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.amber[700],
    marginBottom: 4,
  },
  optionalText: {
    fontWeight: "400",
    color: Colors.amber[600],
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.amber[200],
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.slate[800],
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  noticeSection: {
    marginBottom: 14,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    ...Shadows.sm,
  },
  saveButtonNormal: {
    backgroundColor: Colors.teal[700],
  },
  saveButtonSuccess: {
    backgroundColor: Colors.emerald[600],
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
});

