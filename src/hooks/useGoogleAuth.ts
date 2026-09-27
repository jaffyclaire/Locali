import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { getReadableAuthErrorMessage } from "../lib/authErrors";

// Required for the redirect flow to resolve properly on native
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// CONFIGURATION — Paste your real Firebase OAuth client IDs below
// ============================================================================
// These are placeholder values. Replace each with the corresponding client ID
// from your Firebase project (locali-dca58):
//
//   webClientId     → Firebase Console → Authentication → Sign-in method
//                       → Google → Web SDK configuration → Web client ID
//   iosClientId     → Same page → iOS client ID
//   androidClientId → Same page → Android client ID
//
// After pasting, the file will look like:
//   webClientId: "123456789-abc123.apps.googleusercontent.com",
//   iosClientId: "123456789-def456.apps.googleusercontent.com",
//   androidClientId: "123456789-ghi789.apps.googleusercontent.com",
// ============================================================================
const GOOGLE_CLIENT_IDS = {
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
  });

  const handleGoogleSignIn = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigured()) {
      return;
    }

    try {
      const result = await promptAsync();

      // User cancelled the Google popup/redirect — handle gracefully
      if (result.type !== "success") {
        return;
      }

      const { id_token } = result.params;
      if (!id_token) {
        return;
      }

      const credential = GoogleAuthProvider.credential(id_token);
      await signInWithCredential(auth, credential);
    } catch (err: any) {
      const message = getReadableAuthErrorMessage(err);
      console.warn("Google Sign-In error:", message);
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
