import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dentally-mcp-secure-token-salt-2026";
const GLOBAL_API_KEY = process.env.MCP_API_KEY?.trim();

/**
 * Generates a deterministic, tamper-proof, URL-safe private token for a dentist's email.
 */
export function generateDoctorMcpToken(email: string): string {
  if (!email) throw new Error("Email required to generate doctor MCP token");
  const normalized = email.toLowerCase().trim();
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(normalized)
    .digest("hex")
    .slice(0, 24);

  const encodedEmail = Buffer.from(normalized, "utf8").toString("base64url");
  return `${encodedEmail}_${signature}`;
}

/**
 * Verifies an incoming token and returns the corresponding dentist's email.
 * Accepts:
 *  1. Signed doctor token (`<base64urlEmail>_<sig>`)
 *  2. Configured static master key (`MCP_API_KEY` in .env)
 */
export function verifyDoctorMcpToken(token?: string | null): { email: string; isValid: boolean } {
  if (!token) {
    return { email: "", isValid: false };
  }

  const cleanToken = token.trim();

  // 1. Static global API key check (if set in .env)
  if (GLOBAL_API_KEY && cleanToken === GLOBAL_API_KEY) {
    const ownerEmail = (process.env.ALLOWED_DENTIST_EMAILS || "").split(",")[0]?.trim() || "doctor@dentally.reline.me";
    return { email: ownerEmail, isValid: true };
  }

  // 2. Verify HMAC signature
  try {
    const parts = cleanToken.split("_");
    if (parts.length === 2) {
      const [encodedEmail, signature] = parts;
      if (!encodedEmail || !signature) {
        return { email: "", isValid: false };
      }

      const decodedEmail = Buffer.from(encodedEmail, "base64url").toString("utf8").toLowerCase().trim();

      // Basic RFC email validation check to avoid invalid injection payloads
      if (!decodedEmail.includes("@") || !decodedEmail.includes(".") || decodedEmail.length > 120) {
        return { email: "", isValid: false };
      }

      const expectedSignature = crypto
        .createHmac("sha256", SECRET)
        .update(decodedEmail)
        .digest("hex")
        .slice(0, 24);

      const sigBuf = Buffer.from(signature, "utf8");
      const expectedBuf = Buffer.from(expectedSignature, "utf8");

      // Length check protects against RangeError in timingSafeEqual
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return { email: decodedEmail, isValid: true };
      }
    }
  } catch (err) {
    // Malformed token safely ignored
  }

  return { email: "", isValid: false };
}
