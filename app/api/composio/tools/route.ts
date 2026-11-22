import { NextResponse } from "next/server";
import {
  ComposioError,
  composioFetch,
  getComposioContext,
  MISSING_KEY_MESSAGE,
} from "@/lib/composio/server";

type ComposioTool = {
  slug: string;
  name: string;
  description?: string;
  is_deprecated?: boolean;
};

export type ComposioToolSummary = {
  slug: string;
  name: string;
  description?: string;
};

export type GetComposioToolsResponse = {
  items: ComposioToolSummary[];
  total: number;
};

/**
 * GET /api/composio/tools?toolkit=github&search=
 * List the tools (actions) of one app.
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
    const toolkit = searchParams.get("toolkit")?.trim();
    if (!toolkit) {
      return NextResponse.json(
        { error: "toolkit is required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ toolkit_slug: toolkit, limit: "60" });
    const search = searchParams.get("search")?.trim();
    if (search) {
      params.set("search", search);
    }

    const data = await composioFetch<{
      items: ComposioTool[];
      total_items?: number;
    }>(context, `/tools?${params.toString()}`);

    const items: ComposioToolSummary[] = data.items
      .filter((tool) => !tool.is_deprecated)
      .map((tool) => ({
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
      }));

    return NextResponse.json({
      items,
      total: data.total_items ?? items.length,
    } satisfies GetComposioToolsResponse);
  } catch (error) {
    const status = error instanceof ComposioError ? error.status : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load tools",
      },
      { status }
    );
  }
}
