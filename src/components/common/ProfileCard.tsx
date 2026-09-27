import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuthRole } from "../../context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../constants/theme";
import { PhotoUploadIcon, CloseIcon } from "../icons/AppIcons";
import { pickAvatarImage, uploadImageAsync } from "../../services/storageService";

interface ProfileCardProps {
  roleBadgeText?: string;
  themeColor?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  roleBadgeText,
  themeColor = Colors.teal[700],
}) => {
  const { user, updateUser } = useAuthRole();
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState(user.fullName || user.name || "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const uri = await pickAvatarImage();
      if (!uri) return;

      setUploadingAvatar(true);
      const storagePath = `users/${user.uid}/avatar-${Date.now()}.jpg`;
      const downloadUrl = await uploadImageAsync(uri, storagePath);

      if (updateUser) {
        await updateUser({ avatarUrl: downloadUrl });
      }
    } catch (err) {
      console.error("handlePickAvatar error:", err);
      Alert.alert("Upload Failed", "Could not upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      if (updateUser) {
        await updateUser({
          fullName: nameInput.trim(),
          name: nameInput.trim(),
        });
      }
      setModalVisible(false);
    } catch (err) {
      console.error("handleSaveName error:", err);
      Alert.alert("Error", "Could not update name.");
    } finally {
      setSavingName(false);
    }
  };

  const initials =
    user.initials ||
    (user.fullName
      ? user.fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U");

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={handlePickAvatar}
        disabled={uploadingAvatar}
        activeOpacity={0.8}
      >
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarCircle, { backgroundColor: themeColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        <View style={styles.cameraBadge}>
          {uploadingAvatar ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <PhotoUploadIcon size={12} color={Colors.white} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>
          {user.fullName || user.name || "User"}
        </Text>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {user.email || "user@example.com"}
        </Text>
        {roleBadgeText && (
          <View style={styles.roleBadge}>
            <Text style={[styles.roleBadgeText, { color: themeColor }]}>
              {roleBadgeText}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          setNameInput(user.fullName || user.name || "");
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.editText, { color: themeColor }]}>Edit</Text>
      </TouchableOpacity>

      {/* Edit Name Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon size={18} color={Colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Full Name"
              placeholderTextColor={Colors.slate[400]}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={savingName}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: themeColor }]}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.slate[100],
    ...Shadows.sm,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: Colors.slate[800],
    borderRadius: Radius.full,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.slate[500],
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
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
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
});
