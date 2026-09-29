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
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { Role, UserProfile } from "../types";

interface AuthRoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  signIn: (email?: string, password?: string) => Promise<Role>;
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

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

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

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsLoading(true);
      if (authUser) {
        setFirebaseUser(authUser);
        setIsAuthenticated(true);
        try {
          const userDocRef = doc(db, "users", authUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.disabled) {
              await firebaseSignOut(auth);
              setIsAuthenticated(false);
              setFirebaseUser(null);
              setUser(defaultUser);
              setRoleState("shopper");
              setIsLoading(false);
              return;
            }

            const fullName = data.fullName || authUser.displayName || "User";
            const userRole: Role =
              data.role === "admin"
                ? "admin"
                : data.role === "merchant_owner" || data.role === "merchant"
                ? "merchant"
                : "shopper";

            setRoleState(userRole);
            setUser({
              uid: authUser.uid,
              fullName,
              name: fullName,
              email: authUser.email || data.email || "",
              initials: getInitials(fullName),
              avatarUrl: data.avatarUrl || "",
              role: data.role || userRole,
              interests: data.interests || [],
              notificationPreferences: data.notificationPreferences || {
                proximityAlerts: true,
                merchantAlerts: true,
                dealAlerts: false,
              },
              location: data.location || undefined,
            });
          } else {
            // Profile document doesn't exist yet, populate from Auth User
            const fallbackName = authUser.displayName || authUser.email?.split("@")[0] || "User";
            setUser({
              uid: authUser.uid,
              fullName: fallbackName,
              name: fallbackName,
              email: authUser.email || "",
              initials: getInitials(fallbackName),
              role,
            });
          }
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

      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.disabled) {
            await firebaseSignOut(auth);
            setIsAuthenticated(false);
            setFirebaseUser(null);
            setUser(defaultUser);
            setRoleState("shopper");
            throw new Error("This account has been disabled. Please contact support.");
          }

          const fullName = data.fullName || userCredential.user.displayName || "User";
          const userRole: Role =
            data.role === "admin"
              ? "admin"
              : data.role === "merchant_owner" || data.role === "merchant"
              ? "merchant"
              : "shopper";

          setRoleState(userRole);
          setUser({
            uid: userCredential.user.uid,
            fullName,
            name: fullName,
            email: userCredential.user.email || data.email || "",
            initials: getInitials(fullName),
            avatarUrl: data.avatarUrl || "",
            role: data.role || userRole,
            interests: data.interests || [],
            notificationPreferences: data.notificationPreferences || {
              proximityAlerts: true,
              merchantAlerts: true,
              dealAlerts: false,
            },
            location: data.location || undefined,
          });

          return userRole;
        } else {
          const fallbackName = userCredential.user.displayName || userCredential.user.email?.split("@")[0] || "User";
          setUser({
            uid: userCredential.user.uid,
            fullName: fallbackName,
            name: fallbackName,
            email: userCredential.user.email || "",
            initials: getInitials(fallbackName),
            role: "shopper",
          });
          setRoleState("shopper");
          return "shopper";
        }
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
