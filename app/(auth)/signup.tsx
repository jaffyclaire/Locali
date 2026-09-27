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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { BackArrowIcon, EyeIcon, EyeOffIcon } from "../../src/components/icons/AppIcons";
import { getReadableAuthErrorMessage } from "../../src/lib/authErrors";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuthRole();
  const [roleSelection, setRoleSelection] = useState<"Shopper" | "Merchant Owner">("Shopper");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCreate = async () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email and a password.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      await signUp(email.trim(), password, fullName.trim(), roleSelection);

      if (roleSelection === "Merchant Owner") {
        router.push("/(auth)/merchant-setup");
      } else {
        router.push("/(auth)/onboarding");
      }
    } catch (err: any) {
      setErrorMessage(getReadableAuthErrorMessage(err));
    } finally {
      setLoading(false);
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
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackArrowIcon size={24} color={Colors.slate[600]} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Join your local community directory
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
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Jane Doe"
                placeholderTextColor={Colors.slate[400]}
                editable={!loading}
              />
            </View>

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

            {/* Role picker */}
            <View style={styles.roleContainer}>
              <Text style={styles.inputLabel}>I am a…</Text>
              <View style={styles.segmentedControl}>
                {(["Shopper", "Merchant Owner"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => !loading && setRoleSelection(r)}
                    style={[
                      styles.segmentButton,
                      roleSelection === r && styles.segmentButtonActive,
                    ]}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        roleSelection === r && styles.segmentButtonTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Merchant info box */}
            {roleSelection === "Merchant Owner" && (
              <View style={styles.merchantInfoBox}>
                <Text style={styles.merchantInfoText}>
                  You'll set up your business listing in the next step.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {roleSelection === "Merchant Owner"
                    ? "Continue to Business Setup →"
                    : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text
                style={styles.signInLink}
                onPress={() => router.push("/(auth)/signin")}
              >
                Sign In
              </Text>
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
    padding: 4,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.slate[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.slate[500],
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
  roleContainer: {
    marginBottom: 18,
  },
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  segmentButtonActive: {
    backgroundColor: Colors.teal[700],
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate[600],
  },
  segmentButtonTextActive: {
    color: Colors.white,
  },
  merchantInfoBox: {
    backgroundColor: Colors.teal[50],
    borderWidth: 1,
    borderColor: Colors.teal[100],
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 20,
  },
  merchantInfoText: {
    fontSize: 12,
    color: Colors.teal[800],
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: Colors.teal[700],
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
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
    marginTop: 28,
  },
  footerText: {
    fontSize: 13,
    color: Colors.slate[500],
  },
  signInLink: {
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
});
