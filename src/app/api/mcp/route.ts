import { NextRequest, NextResponse } from "next/server";
import { DENTALLY_MCP_TOOLS } from "@/lib/mcp/tools";
import { executeMcpTool } from "@/lib/mcp/server";
import { clinicProfile } from "@/lib/mockData";
import { verifyAccessToken } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Vercel Free Tier max function timeout

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-dentist-email",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://dentally.reline.me";

  // Returns MCP server metadata & discovery information
  return NextResponse.json(
    {
      name: "dentally-mcp-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      description: "Dentally AI Model Context Protocol endpoint for ChatGPT & Claude",
      clinic: clinicProfile.name,
      dentist: clinicProfile.dentistName,
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {},
        prompts: {},
      },
      authentication: {
        type: "oauth2",
        authorization_url: `${baseUrl}/api/oauth/authorize`,
        token_url: `${baseUrl}/api/oauth/token`,
        scopes: ["openid", "email", "clinic"],
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

function respond(data: any, statusOrInit: number | { status?: number } = 200) {
  const status = typeof statusOrInit === 'number' ? statusOrInit : (statusOrInit?.status ?? 200);
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve Dentist Identity from Bearer OAuth Token or fallback headers
    const authHeader = request.headers.get("authorization");
    const verifiedDoctorEmail = await verifyAccessToken(authHeader);

    // Fallbacks: query param ?email=, custom header x-dentist-email, or default demo account
    const queryEmail = request.nextUrl.searchParams.get("email");
    const headerEmail = request.headers.get("x-dentist-email");
    const dentistEmail = (verifiedDoctorEmail || queryEmail || headerEmail || "dr.ananya@dentally.app").toLowerCase().trim();

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

    // Call a specific dental tool scoped to the authenticated dentist
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
        const result = await executeMcpTool(toolName, toolArguments, dentistEmail);
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
                text: `Tool execution failed: ${toolErr.message || String(toolErr)}`,
              },
            ],
          },
        });
      }
    }

    // Unhandled JSON-RPC method
    return respond(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found`,
        },
      },
      { status: 404 }
    );
  } catch (err: any) {
    return respond(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err.message || String(err)}`,
        },
      },
      { status: 500 }
    );
  }
}
