import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DENTALLY_MCP_TOOLS } from "@/lib/mcp/tools";
import { executeMcpTool } from "@/lib/mcp/server";
import { clinicProfile } from "@/lib/mockData";
import { verifyDoctorMcpToken } from "@/lib/mcp/token";
import { connectDB } from "@/lib/db/connect";
import { ClinicProfileModel } from "@/lib/db/models/ClinicProfile";
import McpLogModel from "@/lib/db/models/McpLog";
import { isClinicConfigured } from "@/lib/clinicOnboarding";
import { clinicSetupRequired } from "@/lib/db/clinicOnboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Vercel Free Tier max function timeout

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function resolveDoctorEmail(request: NextRequest): Promise<{ email: string; isAuthorized: boolean }> {
  // 1. Check query parameter `?key=` or `?token=`
  const urlKey = request.nextUrl.searchParams.get("key") || request.nextUrl.searchParams.get("token");
  if (urlKey) {
    const verified = verifyDoctorMcpToken(urlKey);
    if (verified.isValid) return { email: verified.email, isAuthorized: true };
  }

  // 2. Check HTTP Headers `x-api-key` or `Authorization: Bearer <key>`
  const headerKey =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (headerKey) {
    const verified = verifyDoctorMcpToken(headerKey);
    if (verified.isValid) return { email: verified.email, isAuthorized: true };
  }

  // 3. Check active NextAuth user session (e.g. when testing from Dashboard UI)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      return { email: session.user.email.toLowerCase().trim(), isAuthorized: true };
    }
  } catch (err) {
    // Session lookup fallback
  }

  // 4. Default: Unauthorized
  return { email: "", isAuthorized: false };
}

function respond(data: any, statusOrInit: number | { status?: number } = 200) {
  const status = typeof statusOrInit === "number" ? statusOrInit : statusOrInit?.status ?? 200;
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const { email, isAuthorized } = await resolveDoctorEmail(request);

  return NextResponse.json(
    {
      name: "dentally-mcp-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      description: "Dentally AI Model Context Protocol endpoint for ChatGPT & Claude",
      clinic: clinicProfile.name,
      attendingDentist: isAuthorized ? email : "Unauthorized",
      authenticated: isAuthorized,
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {},
        prompts: {},
      },
      auth: {
        type: "doctor_scoped_url",
        instruction: "Use your private scoped URL from https://dentally.reline.me/dashboard/mcp with Authentication: None in ChatGPT",
      },
      toolsCount: DENTALLY_MCP_TOOLS.length,
      tools: DENTALLY_MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, isAuthorized } = await resolveDoctorEmail(request);
    const body = await request.json();
    const { jsonrpc, id, method, params } = body;

    if (!isAuthorized || !email) {
      return respond(
        {
          jsonrpc: "2.0",
          id: id || null,
          error: {
            code: -32001,
            message: "Unauthorized: Invalid or missing doctor key. Please copy your private MCP URL from https://dentally.reline.me/dashboard/mcp",
          },
        },
        { status: 401 }
      );
    }

    // Connect DB & verify tenant active status + token revocation state
    let clinic = null;
    let clinicUnavailable = false;
    try {
      clinicUnavailable = !(await connectDB());
      if (!clinicUnavailable) clinic = await ClinicProfileModel.findOne({ dentistEmail: email.toLowerCase() }).lean().exec();
    } catch (dbErr) {
      clinicUnavailable = true;
      console.warn("[MCP Gateway] DB lookup error:", dbErr);
    }

    // 1. Tenant Kill Switch: Immediately reject suspended clinics
    if (clinic && (clinic.status === "suspended" || clinic.isActive === false)) {
      return respond(
        {
          jsonrpc: "2.0",
          id: id || null,
          error: {
            code: -32003,
            message: "Access Forbidden: This clinic account is currently suspended by platform administration. Please contact support.",
          },
        },
        { status: 403 }
      );
    }

    // 2. Token Revocation Guard: Reject revoked MCP keys
    if (clinic && clinic.mcpTokenRevoked) {
      return respond(
        {
          jsonrpc: "2.0",
          id: id || null,
          error: {
            code: -32001,
            message: "Unauthorized: Your MCP bearer token has been revoked by platform administrator. Please regenerate a new key from your clinic dashboard.",
          },
        },
        { status: 401 }
      );
    }

    // Handle MCP protocol initialization
    if (method === "initialize") {
      return respond({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "dentally-mcp-server",
            version: "1.0.0",
            dentistEmail: email,
            authenticated: isAuthorized,
          },
          capabilities: {
            tools: {},
          },
        },
      });
    }

    // Ping
    if (method === "ping") {
      return respond({
        jsonrpc: "2.0",
        id,
        result: "pong",
      });
    }

    // List all available dental tools
    if (method === "tools/list") {
      return respond({
        jsonrpc: "2.0",
        id,
        result: {
          tools: DENTALLY_MCP_TOOLS,
        },
      });
    }

    // Call a specific dental tool
    if (method === "tools/call") {
      if (clinicUnavailable || !isClinicConfigured(clinic)) {
        return respond({
          jsonrpc: "2.0",
          id: id ?? null,
          error: {
            code: clinicUnavailable ? -32000 : -32003,
            message: clinicUnavailable ? "Clinic access could not be verified. Please try again." : clinicSetupRequired,
          },
        }, clinicUnavailable ? 503 : 403);
      }
      const toolName = params?.name;
      const toolArguments = params?.arguments || {};
      const startTime = Date.now();

      if (!toolName) {
        return respond(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Missing 'name' in tools/call parameters",
            },
          },
          { status: 400 }
        );
      }

      try {
        const result = await executeMcpTool(toolName, toolArguments, email);
        const latencyMs = Date.now() - startTime;

        // Record successful tool execution telemetry
        try {
          await ClinicProfileModel.updateOne(
            { dentistEmail: email.toLowerCase() },
            { $set: { mcpLastCalledAt: new Date() }, $inc: { mcpCallCount: 1 } }
          );
          await McpLogModel.create({
            dentistEmail: email.toLowerCase(),
            toolName,
            status: "success",
            latencyMs,
            timestamp: new Date(),
          });
        } catch (telemetryErr) {
          console.warn("[MCP Telemetry Error]:", telemetryErr);
        }

        return respond({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } catch (toolErr: any) {
        const latencyMs = Date.now() - startTime;
        try {
          await McpLogModel.create({
            dentistEmail: email.toLowerCase(),
            toolName,
            status: "error",
            latencyMs,
            error: toolErr?.message || String(toolErr),
            timestamp: new Date(),
          });
        } catch (_) {}

        return respond({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error executing ${toolName}: ${toolErr.message || String(toolErr)}`,
              },
            ],
          },
        });
      }
    }

    // Direct REST fallback if an agent posts `{ tool: "get_today_appointments", args: {} }`
    if (body.tool) {
      const startTime = Date.now();
      try {
        const result = await executeMcpTool(body.tool, body.args || {}, email);
        const latencyMs = Date.now() - startTime;
        try {
          await ClinicProfileModel.updateOne(
            { dentistEmail: email.toLowerCase() },
            { $set: { mcpLastCalledAt: new Date() }, $inc: { mcpCallCount: 1 } }
          );
          await McpLogModel.create({
            dentistEmail: email.toLowerCase(),
            toolName: body.tool,
            status: "success",
            latencyMs,
            timestamp: new Date(),
          });
        } catch (_) {}
        return respond({ success: true, tool: body.tool, data: result });
      } catch (restErr: any) {
        const latencyMs = Date.now() - startTime;
        try {
          await McpLogModel.create({
            dentistEmail: email.toLowerCase(),
            toolName: body.tool,
            status: "error",
            latencyMs,
            error: restErr?.message || String(restErr),
            timestamp: new Date(),
          });
        } catch (_) {}
        return respond({ success: false, error: restErr?.message || "Tool execution failed" }, { status: 500 });
      }
    }

    return respond(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found. Supported methods: initialize, tools/list, tools/call, ping`,
        },
      },
      { status: 404 }
    );
  } catch (error: any) {
    return respond(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${error.message}`,
        },
      },
      { status: 500 }
    );
  }
}
