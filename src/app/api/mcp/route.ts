import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DENTALLY_MCP_TOOLS } from "@/lib/mcp/tools";
import { executeMcpTool } from "@/lib/mcp/server";
import { clinicProfile } from "@/lib/mockData";
import { verifyDoctorMcpToken } from "@/lib/mcp/token";
import { DEFAULT_DEMO_EMAIL } from "@/lib/db/repository";

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

  // 4. Default fallback: Demo account
  return { email: DEFAULT_DEMO_EMAIL, isAuthorized: false };
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
      attendingDentist: email === DEFAULT_DEMO_EMAIL ? clinicProfile.dentistName : email,
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
      const toolName = params?.name;
      const toolArguments = params?.arguments || {};

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
      const result = await executeMcpTool(body.tool, body.args || {}, email);
      return respond({ success: true, tool: body.tool, data: result });
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
