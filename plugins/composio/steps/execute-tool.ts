import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ComposioCredentials } from "../credentials";

const COMPOSIO_API_URL = "https://backend.composio.dev/api/v3";
const DEFAULT_USER_ID = "default";

type ComposioExecuteResponse = {
  data?: Record<string, unknown>;
  error?: string | null;
  successful?: boolean;
  log_id?: string;
};

type ExecuteToolResult = {
  data: Record<string, unknown>;
  logId?: string;
};

export type ComposioExecuteToolCoreInput = {
  toolSlug: string;
  toolArguments?: string | Record<string, unknown>;
  userId?: string;
};

export type ComposioExecuteToolInput = StepInput &
  ComposioExecuteToolCoreInput & {
    integrationId?: string;
  };

function parseArguments(
  value: ComposioExecuteToolCoreInput["toolArguments"]
): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to the error below
  }
  throw new Error(
    'Arguments must be a JSON object, for example {"key": "value"}'
  );
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: ComposioExecuteToolCoreInput,
  credentials: ComposioCredentials
): Promise<ExecuteToolResult> {
  const apiKey = credentials.COMPOSIO_API_KEY;

  if (!apiKey) {
    throw new Error("Composio API Key is not configured.");
  }

  const toolSlug = input.toolSlug?.trim().toUpperCase();
  if (!toolSlug) {
    throw new Error(
      "Tool slug is required, for example GITHUB_CREATE_AN_ISSUE."
    );
  }

  const userId =
    input.userId?.trim() || credentials.COMPOSIO_USER_ID || DEFAULT_USER_ID;

  try {
    const response = await fetch(
      `${COMPOSIO_API_URL}/tools/execute/${encodeURIComponent(toolSlug)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          user_id: userId,
          arguments: parseArguments(input.toolArguments),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as ComposioExecuteResponse;

    if (!result.successful) {
      throw new Error(result.error || "Tool execution failed");
    }

    return {
      data: result.data ?? {},
      logId: result.log_id,
    };
  } catch (error) {
    throw new Error(`Failed to execute ${toolSlug}: ${getErrorMessage(error)}`);
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function composioExecuteToolStep(
  input: ComposioExecuteToolInput
): Promise<ExecuteToolResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
composioExecuteToolStep.maxRetries = 0;

export const _integrationType = "composio";
