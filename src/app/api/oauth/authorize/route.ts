import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuthCode } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id") || "dentally-chatgpt-client";
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || undefined;
  const codeChallengeMethod = searchParams.get("code_challenge_method") || undefined;

  // Validate required OAuth 2.0 parameters
  if (!redirectUri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing redirect_uri parameter" },
      { status: 400 }
    );
  }

  if (responseType !== "code") {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "unsupported_response_type");
    if (state) errorUrl.searchParams.set("state", state);
    return NextResponse.redirect(errorUrl.toString());
  }

  // Check if doctor is logged in
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // Redirect to login page and preserve the full OAuth request in callbackUrl
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl.toString());
  }

  try {
    // Generate single-use authorization code bound to this doctor's email
    const code = await createAuthCode({
      dentistEmail: session.user.email,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
    });

    // Redirect back to ChatGPT with code and state
    const returnUrl = new URL(redirectUri);
    returnUrl.searchParams.set("code", code);
    if (state) {
      returnUrl.searchParams.set("state", state);
    }

    return NextResponse.redirect(returnUrl.toString());
  } catch (err: any) {
    console.error("OAuth authorization error:", err);
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "server_error");
    if (state) errorUrl.searchParams.set("state", state);
    return NextResponse.redirect(errorUrl.toString());
  }
}

