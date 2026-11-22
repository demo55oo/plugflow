import "server-only";

import { auth } from "@/lib/auth";
import { getIntegrations } from "@/lib/db/integrations";

const COMPOSIO_API_URL = "https://backend.composio.dev/api/v3";
const DEFAULT_USER_ID = "default";

export type ComposioContext = {
  apiKey: string;
  userId: string;
  integrationId?: string;
};

/**
 * Resolve the Composio key for the signed-in user.
 * Uses the Composio connection they saved in the app, and falls back to
 * COMPOSIO_API_KEY from the environment for local development.
 */
export async function getComposioContext(
  request: Request
): Promise<ComposioContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (session?.user) {
    const saved = await getIntegrations(session.user.id, "composio");
    const integration = saved.find((item) => item.config.composioApiKey);
    if (integration?.config.composioApiKey) {
      return {
        apiKey: integration.config.composioApiKey,
        userId: integration.config.composioUserId || DEFAULT_USER_ID,
        integrationId: integration.id,
      };
    }
  }

  const envKey = process.env.COMPOSIO_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      userId: process.env.COMPOSIO_USER_ID || DEFAULT_USER_ID,
    };
  }

  return null;
}

export class ComposioError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function composioFetch<T>(
  context: ComposioContext,
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const response = await fetch(`${COMPOSIO_API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "x-api-key": context.apiKey,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ComposioError(
      text.slice(0, 500) || `Composio request failed (${response.status})`,
      response.status
    );
  }

  return (await response.json()) as T;
}

export const MISSING_KEY_MESSAGE =
  "Add your Composio API key to browse and run integrations.";
