import crypto from "crypto";
import { DEFAULT_DEMO_EMAIL } from "@/lib/db/repository";

const SECRET = process.env.NEXTAUTH_SECRET || "dentally-mcp-secure-token-salt-2026";
const GLOBAL_API_KEY = process.env.MCP_API_KEY?.trim();

/**
 * Generates a deterministic, tamper-proof, URL-safe private token for a dentist's email.
 */
export function generateDoctorMcpToken(email: string): string {
  const normalized = (email || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
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
 *  3. "demo" or Dr. Ananya's email
 */
export function verifyDoctorMcpToken(token?: string | null): { email: string; isValid: boolean } {
  if (!token) {
    return { email: DEFAULT_DEMO_EMAIL, isValid: false };
  }

  const cleanToken = token.trim();

  // 1. Static global API key check (if set in .env)
  if (GLOBAL_API_KEY && cleanToken === GLOBAL_API_KEY) {
    return { email: DEFAULT_DEMO_EMAIL, isValid: true };
  }

  // 2. Demo token fallback
  if (cleanToken === "demo" || cleanToken.toLowerCase() === DEFAULT_DEMO_EMAIL.toLowerCase()) {
    return { email: DEFAULT_DEMO_EMAIL, isValid: true };
  }

  // 3. Verify HMAC signature
  try {
    const parts = cleanToken.split("_");
    if (parts.length === 2) {
      const [encodedEmail, signature] = parts;
      const decodedEmail = Buffer.from(encodedEmail, "base64url").toString("utf8").toLowerCase().trim();

      const expectedSignature = crypto
        .createHmac("sha256", SECRET)
        .update(decodedEmail)
        .digest("hex")
        .slice(0, 24);

      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { email: decodedEmail, isValid: true };
      }
    }
  } catch (err) {
    // Malformed token
  }

  return { email: DEFAULT_DEMO_EMAIL, isValid: false };
}
