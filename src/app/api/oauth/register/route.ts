import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connect";
import OAuthClientModel from "@/lib/db/models/OAuthClient";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// In-memory fallback
const inMemoryClients = new Map<string, any>();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * RFC 7591 Dynamic Client Registration Endpoint
 * Enables ChatGPT and other OAuth clients to auto-register without manual secret entry.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const clientId = `chatgpt_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = `dentally_${crypto.randomBytes(24).toString("hex")}`;
    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
      ? body.redirect_uris
      : [
          "https://chatgpt.com/aip/oauth/callback",
          "https://chat.openai.com/aip/oauth/callback",
        ];

    const clientRecord = {
      clientId,
      clientSecret,
      clientName: body.client_name || "ChatGPT Dentally Integration",
      redirectUris,
      createdAt: new Date(),
    };

    inMemoryClients.set(clientId, clientRecord);

    try {
      const conn = await connectDB();
      if (conn) {
        await OAuthClientModel.create(clientRecord);
      }
    } catch (dbErr) {
      console.warn("Failed to persist OAuth client to MongoDB, holding in memory:", dbErr);
    }

    const response = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      client_name: clientRecord.clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // Allows zero-secret PKCE
      scope: "openid email clinic",
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Dynamic Client Registration error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to register client dynamically" },
      { status: 500, headers: corsHeaders }
    );
  }
}
