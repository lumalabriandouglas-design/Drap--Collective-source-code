export function houseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.toLowerCase();

  if (msg.includes("unauthorized")) return "Please sign in to continue.";
  if (
    msg.includes("invalid login") ||
    msg.includes("invalid_credentials") ||
    msg.includes("invalid email or password") ||
    msg.includes("invalid_grant") ||
    msg.includes("invalid_email_or_password")
  ) {
    return "That email and password do not match an account in the house.";
  }
  if (msg.includes("provider_config") || msg.includes("popup blocked") || msg.includes("cancelled or failed")) {
    return "Use the email on your atelier account — Google and X are only for new collectors here.";
  }
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("already in the house") || msg.includes("user already")) {
    return "This email is already in the house. Sign in instead.";
  }
  if (msg.includes("database error saving") || msg.includes("unexpected_failure")) {
    return "The house could not open that door. Try again in a moment.";
  }
  if (msg.includes("check your email")) return "Check your email to open the door, then sign in.";
  if (msg.includes("password") && (msg.includes("8") || msg.includes("short") || msg.includes("least"))) {
    return "Use at least 8 characters for the password.";
  }
  if (msg.includes("email") && msg.includes("invalid")) return "Enter a valid email address.";
  if (msg.includes("too long to reply")) return raw;
  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("unexpected token") ||
    msg.includes("is not valid json") ||
    msg.includes("failed to parse")
  ) {
    return "The house could not be reached. Try again in a moment.";
  }
  if (msg.includes("too large")) return "That photograph is still too large after compression.";
  if (msg.includes("not connected") || msg.includes("r2")) {
    return "Photo storage is not fully connected yet. The listing can still wait in the preview.";
  }
  if (msg.includes("open an atelier") || msg.includes("before listing")) {
    return "Open your atelier before listing a piece.";
  }
  if (raw && raw.length < 140 && !msg.includes("error") && !msg.includes("exception")) return raw;
  return "Something went wrong. Please try again.";
}
