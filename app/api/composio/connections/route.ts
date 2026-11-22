import { NextResponse } from "next/server";
import {
  ComposioError,
  composioFetch,
  getComposioContext,
  MISSING_KEY_MESSAGE,
} from "@/lib/composio/server";

type ConnectedAccount = {
  id: string;
  status: string;
  toolkit?: { slug?: string };
};

type AuthConfig = {
  id: string;
  status?: string;
  toolkit?: { slug?: string };
};

export type GetComposioConnectionResponse = {
  connected: boolean;
};

export type CreateComposioConnectionResponse = {
  redirectUrl: string;
};

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof ComposioError ? error.status : 500;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status }
  );
}

/**
 * GET /api/composio/connections?toolkit=github
 * Whether the current Composio user has an active account for this app.
 */
export async function GET(request: Request) {
  try {
    const context = await getComposioContext(request);
    if (!context) {
      return NextResponse.json(
        { error: MISSING_KEY_MESSAGE, code: "missing_key" },
        { status: 400 }
      );
    }

    const toolkit = new URL(request.url).searchParams.get("toolkit")?.trim();
    if (!toolkit) {
      return NextResponse.json(
        { error: "toolkit is required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      toolkit_slugs: toolkit,
      user_ids: context.userId,
      statuses: "ACTIVE",
      limit: "1",
    });
    const data = await composioFetch<{ items: ConnectedAccount[] }>(
      context,
      `/connected_accounts?${params.toString()}`
    );

    return NextResponse.json({
      connected: data.items.length > 0,
    } satisfies GetComposioConnectionResponse);
  } catch (error) {
    return errorResponse(error, "Failed to check connection");
  }
}

/**
 * POST /api/composio/connections { toolkit, callbackUrl }
 * Start connecting an app. Reuses the project's auth configuration for the
 * app, or creates a Composio-managed one, then returns the hosted connect URL.
 */
export async function POST(request: Request) {
  try {
    const context = await getComposioContext(request);
    if (!context) {
      return NextResponse.json(
        { error: MISSING_KEY_MESSAGE, code: "missing_key" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      toolkit?: string;
      callbackUrl?: string;
    };
    const toolkit = body.toolkit?.trim();
    if (!toolkit) {
      return NextResponse.json(
        { error: "toolkit is required" },
        { status: 400 }
      );
    }

    const existing = await composioFetch<{ items: AuthConfig[] }>(
      context,
      `/auth_configs?toolkit_slug=${encodeURIComponent(toolkit)}&limit=5`
    );
    let authConfigId = existing.items.find(
      (item) => item.status !== "DISABLED"
    )?.id;

    if (!authConfigId) {
      const created = await composioFetch<{
        id?: string;
        auth_config?: { id: string };
      }>(context, "/auth_configs", {
        method: "POST",
        body: {
          toolkit: { slug: toolkit },
          auth_config: { type: "use_composio_managed_auth" },
        },
      });
      authConfigId = created.auth_config?.id ?? created.id;
      if (!authConfigId) {
        throw new Error(
          `Could not create an auth configuration for ${toolkit}`
        );
      }
    }

    const link = await composioFetch<{ redirect_url: string }>(
      context,
      "/connected_accounts/link",
      {
        method: "POST",
        body: {
          auth_config_id: authConfigId,
          user_id: context.userId,
          ...(body.callbackUrl ? { callback_url: body.callbackUrl } : {}),
        },
      }
    );

    return NextResponse.json({
      redirectUrl: link.redirect_url,
    } satisfies CreateComposioConnectionResponse);
  } catch (error) {
    return errorResponse(error, "Failed to start connection");
  }
}
