/**
 * Turn Firebase Auth error codes into friendly English strings.
 * Falls back to the raw message when we don't recognise the code.
 */
export function friendlyAuthError(err: unknown): string {
  if (typeof err !== "object" || !("code" in (err ?? {}))) {
    return (err as any)?.message ?? "Something went wrong";
  }
  switch ((err as any).code) {
    case "auth/email-already-in-use":
      return "An account with that email already exists";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    case "auth/user-disabled":
      return "This account has been disabled";
    case "auth/user-not-found":
      return "No account found with that email";
    case "auth/wrong-password":
      return "Incorrect password";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts — try again in a few minutes";
    case "auth/popup-blocked":
      return "Pop-up blocked — allow pop-ups for this site and try again";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled";
    case "auth/cancelled-popup-request":
      return "Sign-in cancelled";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Ask your admin to enable it.";
    case "auth/network-request-failed":
      return "Network error — check your connection";
    default:
      return (err as any).message ?? "Something went wrong";
  }
}
