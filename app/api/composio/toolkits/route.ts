import { NextResponse } from "next/server";
import {
  ComposioError,
  composioFetch,
  getComposioContext,
  MISSING_KEY_MESSAGE,
} from "@/lib/composio/server";

type ComposioToolkit = {
  slug: string;
  name: string;
  no_auth?: boolean;
  meta?: {
    logo?: string;
    description?: string;
    tools_count?: number;
    triggers_count?: number;
    categories?: { id: string; name: string }[];
  };
};

export type ComposioToolkitSummary = {
  slug: string;
  name: string;
  logo?: string;
  description?: string;
  toolsCount: number;
  noAuth: boolean;
};

export type GetComposioToolkitsResponse = {
  items: ComposioToolkitSummary[];
};

/**
 * GET /api/composio/toolkits?search=
 * List the apps available through Composio, most used first.
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

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams({ limit: "40", sort_by: "usage" });
    const search = searchParams.get("search")?.trim();
    if (search) {
      params.set("search", search);
    }

    const data = await composioFetch<{ items: ComposioToolkit[] }>(
      context,
      `/toolkits?${params.toString()}`
    );

    const items: ComposioToolkitSummary[] = data.items.map((toolkit) => ({
      slug: toolkit.slug,
      name: toolkit.name,
      logo: toolkit.meta?.logo,
      description: toolkit.meta?.description,
      toolsCount: toolkit.meta?.tools_count ?? 0,
      noAuth: toolkit.no_auth ?? false,
    }));

    return NextResponse.json({ items } satisfies GetComposioToolkitsResponse);
  } catch (error) {
    const status = error instanceof ComposioError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load toolkits",
      },
      { status }
    );
  }
}
