import { NextResponse } from "next/server";
import {
  ComposioError,
  composioFetch,
  getComposioContext,
  MISSING_KEY_MESSAGE,
} from "@/lib/composio/server";

export type ComposioSchemaProperty = {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
  examples?: unknown[];
};

export type ComposioToolField = {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "json";
  description?: string;
  required: boolean;
  options?: string[];
  example?: string;
};

export type GetComposioToolResponse = {
  slug: string;
  name: string;
  description?: string;
  fields: ComposioToolField[];
};

type ComposioToolDetail = {
  slug: string;
  name: string;
  description?: string;
  input_parameters?: {
    properties?: Record<string, ComposioSchemaProperty>;
    required?: string[];
  };
};

function fieldType(
  property: ComposioSchemaProperty
): ComposioToolField["type"] {
  const type = Array.isArray(property.type)
    ? property.type.find((item) => item !== "null")
    : property.type;
  if (type === "integer" || type === "number") {
    return "number";
  }
  if (type === "boolean") {
    return "boolean";
  }
  if (type === "array" || type === "object") {
    return "json";
  }
  return "string";
}

function exampleOf(property: ComposioSchemaProperty): string | undefined {
  const example = property.examples?.[0] ?? property.default;
  if (example === undefined || example === null) {
    return;
  }
  return typeof example === "string" ? example : JSON.stringify(example);
}

/**
 * GET /api/composio/tools/[slug]
 * Describe one tool as a list of form fields built from its input schema.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const context = await getComposioContext(request);
    if (!context) {
      return NextResponse.json(
        { error: MISSING_KEY_MESSAGE, code: "missing_key" },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const tool = await composioFetch<ComposioToolDetail>(
      context,
      `/tools/${encodeURIComponent(slug)}`
    );

    const properties = tool.input_parameters?.properties ?? {};
    const required = new Set(tool.input_parameters?.required ?? []);

    const fields: ComposioToolField[] = Object.entries(properties)
      .map(([name, property]) => ({
        name,
        label: property.title || name,
        type: fieldType(property),
        description: property.description,
        required: required.has(name),
        options: property.enum?.map(String),
        example: exampleOf(property),
      }))
      .sort((a, b) => Number(b.required) - Number(a.required));

    return NextResponse.json({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      fields,
    } satisfies GetComposioToolResponse);
  } catch (error) {
    const status = error instanceof ComposioError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tool" },
      { status }
    );
  }
}
