import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { Role, UserProfile } from "../types";

let GoogleSignin: typeof import("@react-native-google-signin/google-signin").GoogleSignin | null =
  null;
let statusCodes: typeof import("@react-native-google-signin/google-signin").statusCodes | null =
  null;

if (
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
) {
  try {
    const googleSignInModule =
      require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;
  } catch {
    GoogleSignin = null;
    statusCodes = null;
  }
}

interface AuthRoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  signIn: (email?: string, password?: string) => Promise<Role>;
  signInWithGoogle: () => Promise<Role>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "shopper" | "merchant" | "merchant_owner" | "Shopper" | "Merchant Owner"
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const defaultUser: UserProfile = {
  uid: "mock-user-1",
  fullName: "Jane Doe",
  name: "Jane Doe",
  email: "jane@example.com",
  initials: "JD",
  role: "shopper",
  interests: ["Coffee"],
  notificationPreferences: {
    proximityAlerts: true,
    merchantAlerts: true,
    dealAlerts: false,
  },
};

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getFallbackProfile = (authUser: FirebaseUser): UserProfile => {
  const fullName =
    authUser.displayName || authUser.email?.split("@")[0] || "User";
  return {
    uid: authUser.uid,
    fullName,
    name: fullName,
    email: authUser.email || "",
    initials: getInitials(fullName),
    avatarUrl: authUser.photoURL || "",
    role: "shopper",
    interests: [],
    notificationPreferences: {
      proximityAlerts: true,
      merchantAlerts: true,
      dealAlerts: false,
    },
  };
};

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

const configureGoogleSignIn = () => {
  if (!isFirebaseConfigured() || !GoogleSignin) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;

  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};

const saveUserFromFirebaseAuth = async (authUser: FirebaseUser) => {
  const userDocRef = doc(db, "users", authUser.uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.disabled) {
      await firebaseSignOut(auth);
      return null;
    }

    const fullName = data.fullName || authUser.displayName || "User";
    const userRole: Role =
      data.role === "admin"
        ? "admin"
        : data.role === "merchant_owner" || data.role === "merchant"
        ? "merchant"
        : "shopper";

    const userProfile: UserProfile = {
      uid: authUser.uid,
      fullName,
      name: fullName,
      email: authUser.email || data.email || "",
      initials: getInitials(fullName),
      avatarUrl: data.avatarUrl || data.photoURL || "",
      role: (data.role || userRole) as Role,
      interests: data.interests || [],
      notificationPreferences: data.notificationPreferences || {
        proximityAlerts: true,
        merchantAlerts: true,
        dealAlerts: false,
      },
      location: data.location || undefined,
    };

    return { userRole, userProfile };
  }

  const fallbackProfile = getFallbackProfile(authUser);

  await setDoc(userDocRef, {
    email: authUser.email || "",
    fullName: fallbackProfile.fullName,
    photoURL: authUser.photoURL || "",
    role: "shopper",
    createdAt: serverTimestamp(),
  });

  return { userRole: "shopper" as Role, userProfile: fallbackProfile };
};

export const AuthRoleProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [role, setRoleState] = useState<Role>("shopper");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const setRole = (newRole: Role) => {
    // Normalize role so "merchant_owner" and "merchant" align
    const normalized: Role =
      newRole === "merchant_owner" ? "merchant" : newRole;
    setRoleState(normalized);
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }

    configureGoogleSignIn();

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsLoading(true);
      if (authUser) {
        setFirebaseUser(authUser);
        setIsAuthenticated(true);
        setUser(getFallbackProfile(authUser));
        setRoleState("shopper");
        try {
          const savedUser = await saveUserFromFirebaseAuth(authUser);
          if (!savedUser) {
            setIsAuthenticated(false);
            setFirebaseUser(null);
            setUser(defaultUser);
            setRoleState("shopper");
            setIsLoading(false);
            return;
          }

          setFirebaseUser(authUser);
          setIsAuthenticated(true);
          setRoleState(savedUser.userRole);
          setUser(savedUser.userProfile);
        } catch (err) {
          console.warn("Error fetching user profile from Firestore:", err);
        }
      } else {
        setFirebaseUser(null);
        setIsAuthenticated(false);
        setUser(defaultUser);
        setRoleState("shopper");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email?: string, password?: string): Promise<Role> => {
    if (isFirebaseConfigured() && email && password) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(userCredential.user);
      setIsAuthenticated(true);
      setUser(getFallbackProfile(userCredential.user));
      setRoleState("shopper");

      try {
        const savedUser = await saveUserFromFirebaseAuth(userCredential.user);
        if (!savedUser) {
          throw new Error("This account has been disabled. Please contact support.");
        }

        setRoleState(savedUser.userRole);
        setUser(savedUser.userProfile);
        return savedUser.userRole;
      } catch (err) {
        if (err instanceof Error && err.message.includes("disabled")) {
          throw err;
        }
        console.warn("Error fetching user profile during signIn:", err);
        return role;
      }
    } else {
      if (email === "merchant" || email === "merchant_owner") {
        setRoleState("merchant");
        setIsAuthenticated(true);
        return "merchant";
      } else if (email === "admin") {
        setRoleState("admin");
        setIsAuthenticated(true);
        return "admin";
      } else if (email === "shopper") {
        setRoleState("shopper");
        setIsAuthenticated(true);
        return "shopper";
      }
      setIsAuthenticated(true);
      return role;
    }
  };

  const signInWithGoogle = async (): Promise<Role> => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured.");
    }

    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const result = await signInWithPopup(auth, provider);
        const savedUser = await saveUserFromFirebaseAuth(result.user);
        if (!savedUser) {
          throw new Error("This account has been disabled. Please contact support.");
        }
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        setRoleState(savedUser.userRole);
        setUser(savedUser.userProfile);
        return savedUser.userRole;
      }

      const googleSignin = GoogleSignin;
      if (!googleSignin) {
        throw new Error(
          "Google Sign-In isn't available in Expo Go. Use a development build."
        );
      }

      configureGoogleSignIn();
      await googleSignin.hasPlayServices();
      try {
        await googleSignin.signOut();
      } catch {
        // Clearing a cached account is best-effort before showing the picker.
      }
      const response = await googleSignin.signIn();
      if (response.type !== "success") {
        throw new Error("Google sign-in was cancelled.");
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google sign-in did not return an ID token.");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const savedUser = await saveUserFromFirebaseAuth(result.user);
      if (!savedUser) {
        throw new Error("This account has been disabled. Please contact support.");
      }

      setFirebaseUser(result.user);
      setIsAuthenticated(true);
      setRoleState(savedUser.userRole);
      setUser(savedUser.userProfile);
      return savedUser.userRole;
    } catch (err: any) {
      if (err?.code === statusCodes?.SIGN_IN_CANCELLED) {
        throw new Error("Google sign-in was cancelled.");
      }
      console.warn("Google sign-in error:", err);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "auth/user-not-found"
      ) {
        return;
      }
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    roleInput: "shopper" | "merchant" | "merchant_owner" | "Shopper" | "Merchant Owner"
  ) => {
    const isMerchant =
      roleInput === "merchant" ||
      roleInput === "Merchant Owner" ||
      roleInput === "merchant_owner";

    const firestoreRole = isMerchant ? "merchant_owner" : "shopper";
    const appRole: Role = isMerchant ? "merchant" : "shopper";

    if (isFirebaseConfigured()) {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUid = userCredential.user.uid;

      const profileData = {
        fullName,
        email,
        avatarUrl: "",
        role: firestoreRole,
        createdAt: serverTimestamp(),
        interests: [],
        notificationPreferences: {
          proximityAlerts: true,
          merchantAlerts: true,
          dealAlerts: false,
        },
      };

      await setDoc(doc(db, "users", newUid), profileData);

      setRoleState(appRole);
      setUser({
        uid: newUid,
        fullName,
        name: fullName,
        email,
        initials: getInitials(fullName),
        avatarUrl: "",
        role: firestoreRole,
        interests: [],
        notificationPreferences: profileData.notificationPreferences,
      });
      setIsAuthenticated(true);
    } else {
      // Development mock fallback
      setRoleState(appRole);
      setUser({
        uid: "mock-user-" + Date.now(),
        fullName,
        name: fullName,
        email,
        initials: getInitials(fullName),
        role: firestoreRole,
      });
      setIsAuthenticated(true);
    }
  };

  const signOut = async () => {
    if (isFirebaseConfigured()) {
      await firebaseSignOut(auth);
    }
    if (Platform.OS !== "web" && GoogleSignin) {
      try {
        await GoogleSignin.signOut();
      } catch {
        // Firebase sign-out is authoritative; native account cleanup is best-effort.
      }
    }
    setIsAuthenticated(false);
    setFirebaseUser(null);
    setUser(defaultUser);
    setRoleState("shopper");
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
    if (isFirebaseConfigured() && user?.uid) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          { ...updates, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (err) {
        console.warn("updateUser firestore error:", err);
      }
    }
  };

  return (
    <AuthRoleContext.Provider
      value={{
        role,
        setRole,
        isAuthenticated,
        isLoading,
        user,
        firebaseUser,
        signIn,
        signInWithGoogle,
        resetPassword,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthRoleContext.Provider>
  );
};

export const useAuthRole = (): AuthRoleContextType => {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error("useAuthRole must be used within an AuthRoleProvider");
  }
  return context;
};
