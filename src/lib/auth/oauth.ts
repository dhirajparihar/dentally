import crypto from "crypto";
import { encode, decode } from "next-auth/jwt";
import OAuthCodeModel, { IOAuthCode } from "@/lib/db/models/OAuthCode";
import { connectDB } from "@/lib/db/connect";

const OAUTH_SECRET = process.env.NEXTAUTH_SECRET || "dentally-secret-key-change-in-production-2026";
const CODE_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

// In-memory fallback for local dev or temporary connectivity issues
const inMemoryCodes = new Map<string, IOAuthCode>();

function cleanExpiredMemoryCodes() {
  const now = Date.now();
  for (const [code, entry] of inMemoryCodes.entries()) {
    if (new Date(entry.expiresAt).getTime() < now) {
      inMemoryCodes.delete(code);
    }
  }
}

/**
 * Generate a cryptographically secure 32-byte authorization code
 */
export async function createAuthCode(params: {
  dentistEmail: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}): Promise<string> {
  const code = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS);

  const entry: IOAuthCode = {
    code,
    dentistEmail: params.dentistEmail.toLowerCase().trim(),
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    createdAt: new Date(),
    expiresAt,
  };

  cleanExpiredMemoryCodes();
  inMemoryCodes.set(code, entry);

  try {
    const conn = await connectDB();
    if (conn) {
      await OAuthCodeModel.create(entry);
    }
  } catch (err) {
    console.error("Failed to persist OAuthCode to MongoDB, using in-memory store:", err);
  }

  return code;
}

/**
 * Verify and consume a single-use authorization code (RFC 6749)
 */
export async function consumeAuthCode(params: {
  code: string;
  clientId?: string;
  redirectUri?: string;
  codeVerifier?: string;
}): Promise<IOAuthCode | null> {
  let record: IOAuthCode | null = null;

  try {
    const conn = await connectDB();
    if (conn) {
      const found = await OAuthCodeModel.findOneAndDelete({ code: params.code }).lean();
      if (found) {
        record = found as IOAuthCode;
      }
    }
  } catch (err) {
    console.error("MongoDB OAuthCode query error, falling back to in-memory:", err);
  }

  if (!record && inMemoryCodes.has(params.code)) {
    record = inMemoryCodes.get(params.code)!;
    inMemoryCodes.delete(params.code);
  }

  if (!record) {
    return null;
  }

  // Check expiration
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return null;
  }

  // Check PKCE code_verifier if code_challenge was provided
  if (record.codeChallenge && params.codeVerifier) {
    const method = (record.codeChallengeMethod || "plain").toUpperCase();
    if (method === "S256") {
      const computedChallenge = crypto
        .createHash("sha256")
        .update(params.codeVerifier)
        .digest("base64url");
      if (computedChallenge !== record.codeChallenge) {
        console.warn("OAuth PKCE verification failed");
        return null;
      }
    } else if (method === "PLAIN") {
      if (params.codeVerifier !== record.codeChallenge) {
        console.warn("OAuth PKCE plain verification failed");
        return null;
      }
    }
  }

  return record;
}

/**
 * Create a signed, tamper-proof JWE access token for ChatGPT
 */
export async function createAccessToken(dentistEmail: string): Promise<string> {
  const normalized = dentistEmail.toLowerCase().trim();
  const token = await encode({
    token: {
      sub: normalized,
      email: normalized,
      iss: "https://dentally.reline.me",
      aud: "dentally-mcp",
      scope: "openid email clinic",
    },
    secret: OAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return token;
}

/**
 * Verify incoming Bearer token from ChatGPT headers and return dentist's email
 */
export async function verifyAccessToken(authHeaderOrToken?: string | null): Promise<string | null> {
  if (!authHeaderOrToken) return null;

  const rawToken = authHeaderOrToken.startsWith("Bearer ")
    ? authHeaderOrToken.slice(7).trim()
    : authHeaderOrToken.trim();

  if (!rawToken) return null;

  try {
    const payload = await decode({
      token: rawToken,
      secret: OAUTH_SECRET,
    });

    if (payload && (payload.email || payload.sub)) {
      return String(payload.email || payload.sub).toLowerCase().trim();
    }
  } catch (err) {
    console.warn("Invalid or expired OAuth token received:", err);
  }

  return null;
}

