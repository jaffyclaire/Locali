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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import { Colors, Radius, Shadows } from "../../src/constants/theme";
import { EyeIcon, EyeOffIcon } from "../../src/components/icons/AppIcons";
import { AppLogo } from "../../src/components/AppLogo";
import { getReadableAuthErrorMessage } from "../../src/lib/authErrors";
import { isValidEmail } from "../../src/lib/authValidation";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuthRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const resolvedRole = await signIn(email.trim(), password);
      if (resolvedRole === "admin") {
        router.replace("/(admin)/dashboard");
      } else if (resolvedRole === "merchant" || (resolvedRole as string) === "merchant_owner") {
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const resolvedRole = await signInWithGoogle();
      if (resolvedRole === "admin") {
        router.replace("/(admin)/dashboard");
      } else if (resolvedRole === "merchant" || (resolvedRole as string) === "merchant_owner") {
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
            <AppLogo />
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
              onPress={() => router.push("/(auth)/forgot-password")}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.googleButtonInner}>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
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
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate[200],
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.slate[500],
    fontSize: 12,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    paddingVertical: 14,
    alignItems: "center",
    ...Shadows.sm,
  },
  googleButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: Colors.teal[50],
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    color: Colors.teal[700],
    fontSize: 12,
    fontWeight: "800",
  },
  googleButtonText: {
    color: Colors.slate[700],
    fontSize: 15,
    fontWeight: "700",
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
});
