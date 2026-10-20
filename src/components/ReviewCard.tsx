import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Radius } from "../constants/theme";
import { StarIcon } from "./icons/AppIcons";
import { MerchantReviewWithProfile } from "../services/merchantCommunityService";
import { ReviewPhotos } from "./ReviewPhotos";

interface ReviewCardProps {
  review: MerchantReviewWithProfile;
  businessName: string;
  compact?: boolean;
  onSaveReply?: (reply: string) => Promise<void>;
  onDeleteReply?: () => Promise<void>;
}

const relativeTime = (value: unknown): string => {
  let date: Date | null = value instanceof Date ? value : null;
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      const resolved = toDate.call(value);
      if (resolved instanceof Date) date = resolved;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const resolved = new Date(value);
    if (!Number.isNaN(resolved.getTime())) date = resolved;
  }
  if (!date) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const firebaseErrorMessage = (error: unknown): string => {
  const detail = error as { code?: unknown; message?: unknown };
  const code = typeof detail?.code === "string" ? detail.code : "unknown";
  const message =
    typeof detail?.message === "string"
      ? detail.message
      : error instanceof Error
        ? error.message
        : "Please try again.";
  return `Could not save the reply (${code}): ${message}`;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  businessName,
  compact = false,
  onSaveReply,
  onDeleteReply,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.reply || "");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitReply = async () => {
    if (!onSaveReply || !draft.trim() || saving) return;
    setSaving(true);
    setErrorMessage("");
    try {
      await onSaveReply(draft.trim());
      setEditing(false);
    } catch (error) {
      setErrorMessage(firebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!onDeleteReply) return;
    Alert.alert("Delete reply?", "This reply will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setErrorMessage("");
          void onDeleteReply().catch((error: unknown) =>
            setErrorMessage(firebaseErrorMessage(error))
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
          <Text style={styles.time}>{relativeTime(review.createdAt)}</Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              size={14}
              color={star <= review.rating ? Colors.amber[500] : Colors.slate[200]}
            />
          ))}
        </View>
        {compact && !!review.reply && onSaveReply && (
          <Text style={styles.repliedMarker}>Replied</Text>
        )}
      </View>

      {!!review.comment && (
        <Text
          style={styles.comment}
          numberOfLines={compact ? 3 : undefined}
        >
          {review.comment}
        </Text>
      )}
      <ReviewPhotos imageUrls={review.imageUrls} />

      {!!review.reply && !editing && (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>Business reply</Text>
          <Text style={styles.replyBusiness}>{businessName}</Text>
          <Text style={styles.replyText}>{review.reply}</Text>
          <Text style={styles.replyTime}>{relativeTime(review.repliedAt)}</Text>
          {onSaveReply && onDeleteReply && (
            <View style={styles.replyActions}>
              <TouchableOpacity
                onPress={() => {
                  setDraft(review.reply || "");
                  setEditing(true);
                  setErrorMessage("");
                }}
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} accessibilityRole="button">
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {editing && onSaveReply ? (
        <View style={styles.editor}>
          <TextInput
            value={draft}
            onChangeText={(value) => setDraft(value.slice(0, 500))}
            maxLength={500}
            multiline
            placeholder="Write a reply..."
            placeholderTextColor={Colors.slate[400]}
            style={styles.input}
          />
          <Text style={styles.characterCount}>{draft.length}/500</Text>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          <View style={styles.editorActions}>
            <TouchableOpacity
              onPress={() => {
                setDraft(review.reply || "");
                setEditing(false);
                setErrorMessage("");
              }}
              disabled={saving}
              style={styles.cancelButton}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void submitReply()}
              disabled={saving || !draft.trim()}
              style={[
                styles.sendButton,
                (saving || !draft.trim()) && styles.disabledButton,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.sendText}>{saving ? "Sending..." : "Send"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : !review.reply && onSaveReply ? (
        <TouchableOpacity
          onPress={() => {
            setDraft("");
            setEditing(true);
            setErrorMessage("");
          }}
          style={styles.replyButton}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      ) : null}
      {!editing && !!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate[100],
    gap: 7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  identity: { flex: 1 },
  reviewerName: {
    color: Colors.slate[800],
    fontSize: 13,
    fontWeight: "700",
  },
  time: { color: Colors.slate[400], fontSize: 11, marginTop: 2 },
  stars: { flexDirection: "row", gap: 1 },
  repliedMarker: {
    color: Colors.emerald[700],
    fontSize: 10,
    fontWeight: "700",
  },
  comment: { color: Colors.slate[700], fontSize: 13, lineHeight: 19 },
  reply: {
    marginTop: 5,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: Colors.teal[200],
    gap: 3,
  },
  replyLabel: { color: Colors.teal[700], fontSize: 11, fontWeight: "700" },
  replyBusiness: { color: Colors.slate[600], fontSize: 11, fontWeight: "600" },
  replyText: { color: Colors.slate[700], fontSize: 12, lineHeight: 18 },
  replyTime: { color: Colors.slate[400], fontSize: 10 },
  replyActions: { flexDirection: "row", gap: 18, marginTop: 5 },
  actionText: { color: Colors.teal[700], fontSize: 13, fontWeight: "700" },
  deleteText: { color: Colors.rose[600], fontSize: 13, fontWeight: "700" },
  replyButton: { alignSelf: "flex-start", paddingVertical: 4, paddingRight: 12 },
  editor: {
    marginTop: 5,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.slate[50],
  },
  input: {
    minHeight: 64,
    textAlignVertical: "top",
    color: Colors.slate[800],
    fontSize: 13,
  },
  characterCount: {
    color: Colors.slate[400],
    fontSize: 10,
    textAlign: "right",
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  cancelButton: { paddingVertical: 8 },
  sendButton: {
    minWidth: 72,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.teal[700],
  },
  disabledButton: { opacity: 0.5 },
  sendText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  error: { color: Colors.rose[700], fontSize: 11, lineHeight: 16 },
});
