import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { getReadableAuthErrorMessage } from "../../src/lib/authErrors";
import { isValidEmail } from "../../src/lib/authValidation";

const SUCCESS_MESSAGE =
  "If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuthRole();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      setIsSuccess(false);
      setMessage("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setIsSuccess(false);
      setMessage("Enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      await resetPassword(email);
      setIsSuccess(true);
      setMessage(SUCCESS_MESSAGE);
    } catch (error) {
      setIsSuccess(false);
      setMessage(getReadableAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>L</Text>
            </View>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we’ll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setMessage("");
                  setIsSuccess(false);
                }}
                placeholder="you@email.com"
                placeholderTextColor={Colors.slate[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="send"
                onSubmitEditing={handleSendResetLink}
              />
            </View>

            {message !== "" && (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.message,
                  isSuccess ? styles.successMessage : styles.errorMessage,
                ]}
              >
                {message}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSendResetLink}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Send reset link</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text
              style={styles.backLink}
              onPress={() => router.replace("/(auth)/signin")}
            >
              Back to sign in
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 36,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.teal[700],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...Shadows.sm,
  },
  logoText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.slate[500],
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
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
  message: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 16,
  },
  successMessage: {
    color: Colors.emerald[700],
  },
  errorMessage: {
    color: Colors.rose[700],
  },
  primaryButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  backLink: {
    fontSize: 13,
    color: Colors.teal[700],
    fontWeight: "700",
  },
});
