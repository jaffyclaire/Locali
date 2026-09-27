import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { getReadableAuthErrorMessage } from "../lib/authErrors";

// Required for the redirect flow to resolve properly on native
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// CONFIGURATION — Expo Go Compatible Google Sign-In
// ============================================================================
// For Expo Go, ONLY the webClientId is needed. The proxy-based web OAuth flow
// is used, which opens a browser-based Google sign-in that works identically
// in Expo Go and on web.
//
// Replace this with your real Web Client ID from:
//   Firebase Console → Authentication → Sign-in method → Google
//   → Web SDK configuration → Web client ID
//
// The webClientId format is: <project-number>-<random>.apps.googleusercontent.com
// ============================================================================
const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured()) {
      return;
    }

    try {
      console.log("[useGoogleAuth] Starting Google sign-in flow");
      const result = await promptAsync();

      // User cancelled the Google popup/redirect — handle gracefully
      if (result.type !== "success") {
        console.log("[useGoogleAuth] Google sign-in cancelled or failed:", result.type);
        return;
      }

      const { id_token } = result.params;
      if (!id_token) {
        console.warn("[useGoogleAuth] No id_token in Google sign-in response");
        return;
      }

      console.log("[useGoogleAuth] Got id_token, exchanging for Firebase credential");
      const credential = GoogleAuthProvider.credential(id_token);
      await signInWithCredential(auth, credential);
      console.log("[useGoogleAuth] Firebase sign-in successful");
    } catch (err: any) {
      const message = getReadableAuthErrorMessage(err);
      console.error("[useGoogleAuth] Google Sign-In error:", message);
      throw err;
    }
  }, [promptAsync]);

  return {
    request,
    response,
    promptAsync,
    handleGoogleSignIn,
  };
};
