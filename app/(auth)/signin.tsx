import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../../src/lib/firebase";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { useGoogleAuth } from "../../src/hooks/useGoogleAuth";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { GoogleIcon, EyeIcon, EyeOffIcon } from "../../src/components/icons/AppIcons";
import { getReadableAuthErrorMessage } from "../../src/lib/authErrors";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, role } = useAuthRole();
  const { handleGoogleSignIn } = useGoogleAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      await signIn(email.trim(), password);
      if (role === "merchant" || (role as string) === "merchant_owner") {
        router.replace("/(merchant)/dashboard");
      } else {
        router.replace("/(shopper)/home");
      }
    } catch (err: any) {
      setErrorMessage(getReadableAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (!isFirebaseConfigured()) {
      return;
    }

    try {
      setGoogleLoading(true);
      setErrorMessage("");
      await handleGoogleSignIn();
      // Navigation is handled by onAuthStateChanged in AuthRoleContext
    } catch (err: any) {
      setErrorMessage(getReadableAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email);
    setResetMessage("");
    setResetModalVisible(true);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetMessage("Please enter your email address.");
      return;
    }

    try {
      setResetLoading(true);
      setResetMessage("");
      if (isFirebaseConfigured()) {
        await sendPasswordResetEmail(auth, resetEmail.trim());
      }
      setResetMessage(
        "If an account exists for this email, a reset link has been sent."
      );
    } catch (err: any) {
      setResetMessage(getReadableAuthErrorMessage(err));
    } finally {
      setResetLoading(false);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>L</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to discover local businesses near you
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMessage !== "" && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="you@email.com"
                placeholderTextColor={Colors.slate[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate[400]}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color={Colors.slate[400]} />
                  ) : (
                    <EyeIcon size={20} color={Colors.slate[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={openForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
              onPress={handleGooglePress}
              disabled={googleLoading || loading}
              activeOpacity={0.85}
            >
              <GoogleIcon size={18} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{" "}
              <Text
                style={styles.signUpLink}
                onPress={() => router.push("/(auth)/signup")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={resetEmail}
              onChangeText={(text) => {
                setResetEmail(text);
                if (resetMessage) setResetMessage("");
              }}
              placeholder="you@email.com"
              placeholderTextColor={Colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!resetLoading}
            />

            {resetMessage !== "" && (
              <Text
                style={[
                  styles.modalMessage,
                  resetMessage.includes("reset link has been sent")
                    ? styles.modalMessageSuccess
                    : styles.modalMessageError,
                ]}
              >
                {resetMessage}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                resetLoading && styles.buttonDisabled,
              ]}
              onPress={handlePasswordReset}
              disabled={resetLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSubmitButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
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
  errorBanner: {
    backgroundColor: Colors.rose[50],
    borderWidth: 1,
    borderColor: Colors.rose[200],
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.rose[700],
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.teal[700],
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate[200],
  },
  dividerText: {
    fontSize: 12,
    color: Colors.slate[400],
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    paddingVertical: 13,
    backgroundColor: Colors.white,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[700],
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: Colors.slate[500],
  },
  signUpLink: {
    color: Colors.teal[700],
    fontWeight: "700",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.slate[900],
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius["2xl"],
    padding: 20,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.slate[800],
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate[500],
  },
  modalDescription: {
    fontSize: 13,
    color: Colors.slate[600],
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.slate[900],
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 12,
  },
  modalMessageSuccess: {
    color: Colors.emerald[700],
  },
  modalMessageError: {
    color: Colors.rose[700],
  },
  modalSubmitButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  modalSubmitButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
