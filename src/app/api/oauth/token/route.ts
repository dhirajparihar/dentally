import { NextRequest, NextResponse } from "next/server";
import { consumeAuthCode, createAccessToken } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    let grantType = "";
    let code = "";
    let redirectUri = "";
    let clientId = "";
    let codeVerifier = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      grantType = String(formData.get("grant_type") || "");
      code = String(formData.get("code") || "");
      redirectUri = String(formData.get("redirect_uri") || "");
      clientId = String(formData.get("client_id") || "");
      codeVerifier = String(formData.get("code_verifier") || "");
    } else {
      const body = await request.json().catch(() => ({}));
      grantType = body.grant_type || "";
      code = body.code || "";
      redirectUri = body.redirect_uri || "";
      clientId = body.client_id || "";
      codeVerifier = body.code_verifier || "";
    }

    // Also support Basic Auth header for client credentials
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
        const [bUser] = decoded.split(":");
        if (!clientId && bUser) clientId = bUser;
      } catch (e) {
        // ignore basic auth parse failure
      }
    }

    if (grantType !== "authorization_code") {
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Only authorization_code grant is supported" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing authorization code" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate and consume single-use code
    const authRecord = await consumeAuthCode({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    });

    if (!authRecord) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Authorization code is invalid or has expired" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Issue signed JWT access token for ChatGPT
    const accessToken = await createAccessToken(authRecord.dentistEmail);

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 30 * 24 * 60 * 60, // 30 days
        scope: "openid email clinic",
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err: any) {
    console.error("OAuth token exchange error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: err.message || "Failed to issue access token" },
      { status: 500, headers: corsHeaders }
    );
  }
}
