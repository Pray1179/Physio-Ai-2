import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, isDemoMode } from "@/lib/firebase";
import { getUserProfile, setDocData } from "@/lib/firestore";
import {
  type DemoUserRecord,
  demoUserByEmail,
  demoUpsertUser,
  demoUpdateUser,
} from "@/lib/demo";
import { updateUserProfile } from "@/lib/repo";
import type { ProfilePatch } from "@/lib/repo";
import type { Role } from "@/types";

/**
 * Session persistence key (used only in demo mode).
 */
const DEMO_SESSION_KEY = "physioai_demo_session";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  /**
   * True for a cloud account that authenticated via Google but has no
   * profile document yet — the owner must pick patient/doctor once on
   * /choose-role before the app unlocks. Absent for demo + email users.
   */
  onboarding?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: Role
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Popup Google sign-in. Returns whether the account is brand new and needs
   *  a role on /choose-role, plus the existing role if any. */
  signInWithGoogle: () => Promise<{ newUser: boolean; role: Role | null }>;
  /** Pick patient/doctor for an account that signed in before having a profile. */
  finishOnboarding: (role: Role, displayName?: string) => Promise<void>;
  /** Merge profile fields into the user record (demo localStorage or Firestore).
   *  When displayName changes, the context state and Firebase Auth record
   *  are updated immediately so the header reflects the new name. */
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ------------------------------------------------------------------ */
/* Demo helpers                                                         */
/* ------------------------------------------------------------------ */

function recordToAuthUser(rec: DemoUserRecord): AuthUser {
  return {
    uid: rec.uid,
    email: rec.email,
    displayName: rec.displayName,
    role: rec.role,
  };
}

function readDemoSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeDemoSession(user: AuthUser | null) {
  if (user) localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(DEMO_SESSION_KEY);
}

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* Restore session on mount */
  useEffect(() => {
    if (isDemoMode) {
      setUser(readDemoSession());
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            // Cloud account with no profile doc yet: force the one-time role
            // picker before the app unlocks.
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              displayName: firebaseUser.displayName ?? "User",
              role: "patient", // provisional until /choose-role
              onboarding: true,
            });
            return;
          }
          const role = (profile.role as Role) ?? "patient";
          setUser({
            uid: firebaseUser.uid,
            email: profile.email ?? firebaseUser.email ?? "",
            displayName: profile.displayName ?? firebaseUser.displayName ?? "User",
            role,
          });
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDemoMode) {
      const rec = demoUserByEmail(email);
      if (!rec || rec.password !== password) {
        throw new Error("Invalid email or password");
      }
      const authUser = recordToAuthUser(rec);
      setUser(authUser);
      writeDemoSession(authUser);
      return;
    }
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: Role
    ) => {
      if (isDemoMode) {
        if (demoUserByEmail(email)) {
          throw new Error("An account with this email already exists");
        }
        const uid = `demo_${Date.now().toString(36)}`;
        const rec: DemoUserRecord = {
          uid,
          email: email.toLowerCase(),
          displayName,
          role,
          password,
          createdAt: new Date().toISOString(),
        };
        demoUpsertUser(rec);
        const authUser = recordToAuthUser(rec);
        setUser(authUser);
        writeDemoSession(authUser);
        return;
      }

      if (!auth) throw new Error("Firebase not configured");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Persist profile so role survives page reload
      await setDocData("users", cred.user.uid, {
        uid: cred.user.uid,
        displayName,
        email: email.toLowerCase(),
        role,
        createdAt: new Date().toISOString(),
      } as never);
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      writeDemoSession(null);
      setUser(null);
      return;
    }
    if (auth) await firebaseSignOut(auth);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (isDemoMode) {
      if (!demoUserByEmail(email)) {
        throw new Error("No account found with this email");
      }
      return;
    }
    if (!auth) throw new Error("Firebase not configured");
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signInWithGoogle = useCallback(
    async (): Promise<{ newUser: boolean; role: Role | null }> => {
      if (!auth) throw new Error("Firebase not configured");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const profile = await getUserProfile(cred.user.uid);
      return profile
        ? { newUser: false, role: (profile.role as Role) ?? null }
        : { newUser: true, role: null };
    },
    []
  );

  const finishOnboarding = useCallback(
    async (role: Role, displayName?: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!auth) throw new Error("Firebase not configured");

      const name = displayName?.trim() || user.displayName || "User";
      // Provision the profile doc (role is what the rest of the app keys off)
      await setDocData("users", user.uid, {
        uid: user.uid,
        displayName: name,
        email: user.email.toLowerCase(),
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Keep firebase.auth().currentUser.displayName in sync with the profile
      if (auth.currentUser && auth.currentUser.displayName !== name) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: name });
      }

      setUser({ ...user, role, displayName: name, onboarding: false });
    },
    [user]
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!user) throw new Error("Not authenticated");

      if (isDemoMode) {
        demoUpdateUser(user.uid, patch);
      } else {
        // Firebase: update Auth displayName if changed, then persist all fields to Firestore
        if (patch.displayName && auth?.currentUser) {
          await firebaseUpdateProfile(auth.currentUser, {
            displayName: patch.displayName,
          });
        }
        await updateUserProfile(user.uid, patch);
      }

      // Optimistically update local auth state so the header reflects the change
      if (patch.displayName !== undefined) {
        setUser((prev) =>
          prev ? { ...prev, displayName: patch.displayName! } : prev
        );
        writeDemoSession(
          user ? { ...user, displayName: patch.displayName! } : null
        );
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoMode: isDemoMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
        finishOnboarding,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}