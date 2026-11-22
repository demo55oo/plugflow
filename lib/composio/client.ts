import type { CreateComposioConnectionResponse } from "@/app/api/composio/connections/route";
import type { GetComposioToolkitsResponse } from "@/app/api/composio/toolkits/route";
import type { GetComposioToolResponse } from "@/app/api/composio/tools/[slug]/route";
import type { GetComposioToolsResponse } from "@/app/api/composio/tools/route";

export const COMPOSIO_ACTION_TYPE = "composio/execute-tool";
export const COMPOSIO_ARGUMENT_PREFIX = "arg__";

export class ComposioClientError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new ComposioClientError(
      data.error || "Composio request failed",
      data.code
    );
  }
  return data;
}

export const composioClient = {
  toolkits: (search: string) =>
    request<GetComposioToolkitsResponse>(
      `/api/composio/toolkits?search=${encodeURIComponent(search)}`
    ),
  tools: (toolkit: string, search: string) =>
    request<GetComposioToolsResponse>(
      `/api/composio/tools?toolkit=${encodeURIComponent(toolkit)}&search=${encodeURIComponent(search)}`
    ),
  tool: (slug: string) =>
    request<GetComposioToolResponse>(
      `/api/composio/tools/${encodeURIComponent(slug)}`
    ),
  isConnected: (toolkit: string) =>
    request<{ connected: boolean }>(
      `/api/composio/connections?toolkit=${encodeURIComponent(toolkit)}`
    ),
  connect: (toolkit: string, callbackUrl: string) =>
    request<CreateComposioConnectionResponse>("/api/composio/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkit, callbackUrl }),
    }),
  saveKey: (apiKey: string) =>
    request<{ id: string }>("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Composio",
        type: "composio",
        config: { composioApiKey: apiKey },
      }),
    }),
  integrationId: async () => {
    const all =
      await request<{ id: string; type: string }[]>("/api/integrations");
    return all.find((item) => item.type === "composio")?.id;
  },
};
