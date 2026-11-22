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

type ExecuteToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: { message: string } };

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

const ARGUMENT_PREFIX = "arg__";

type ToolSchema = {
  input_parameters?: {
    properties?: Record<string, { type?: string | string[] }>;
  };
};

function schemaType(type: string | string[] | undefined): string | undefined {
  return Array.isArray(type) ? type.find((item) => item !== "null") : type;
}

function coerceValue(value: unknown, type: string | undefined): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (type === "integer" || type === "number") {
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (type === "boolean") {
    return trimmed.toLowerCase() === "true";
  }
  if (type === "array" || type === "object") {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Collect the per-field arguments written by the tool form (arg__name keys)
 * and convert each one to the type the tool's schema expects.
 */
async function collectFieldArguments(
  input: Record<string, unknown>,
  toolSlug: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const entries = Object.entries(input).filter(
    ([key, value]) =>
      key.startsWith(ARGUMENT_PREFIX) &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );
  if (entries.length === 0) {
    return {};
  }

  let properties: Record<string, { type?: string | string[] }> = {};
  try {
    const response = await fetch(
      `${COMPOSIO_API_URL}/tools/${encodeURIComponent(toolSlug)}`,
      { headers: { "x-api-key": apiKey } }
    );
    if (response.ok) {
      const schema = (await response.json()) as ToolSchema;
      properties = schema.input_parameters?.properties ?? {};
    }
  } catch {
    // Without the schema, values are sent as entered
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    const name = key.slice(ARGUMENT_PREFIX.length);
    result[name] = coerceValue(value, schemaType(properties[name]?.type));
  }
  return result;
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: ComposioExecuteToolCoreInput,
  credentials: ComposioCredentials
): Promise<ExecuteToolResult> {
  const apiKey = credentials.COMPOSIO_API_KEY || process.env.COMPOSIO_API_KEY;

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

  const toolArguments = {
    ...parseArguments(input.toolArguments),
    ...(await collectFieldArguments(
      input as Record<string, unknown>,
      toolSlug,
      apiKey
    )),
  };

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
          arguments: toolArguments,
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

    return { success: true, data: result.data ?? {} };
  } catch (error) {
    return {
      success: false,
      error: {
        message: `Failed to execute ${toolSlug}: ${getErrorMessage(error)}`,
      },
    };
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
