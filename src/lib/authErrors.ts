export const getReadableAuthErrorMessage = (error: any): string => {
  if (!error) return "";

  const code = error.code || "";

  switch (code) {
    case "auth/popup-closed-by-user":
      return "";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Sign in with that method first.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/requires-recent-login":
      return "Please re-authenticate and try again.";
    default:
      if (error.message && typeof error.message === "string") {
        // Strip Firebase prefix if present
        return error.message.replace(/^Firebase:\s*/, "");
      }
      return "An unexpected error occurred. Please try again.";
  }
};
