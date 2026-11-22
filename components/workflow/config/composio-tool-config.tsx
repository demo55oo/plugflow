"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ComposioToolField,
  GetComposioToolResponse,
} from "@/app/api/composio/tools/[slug]/route";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import {
  COMPOSIO_ARGUMENT_PREFIX,
  composioClient,
} from "@/lib/composio/client";
import { cn } from "@/lib/utils";

type ComposioToolConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled?: boolean;
};

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ComposioToolField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = `composio-${field.name}`;

  if (field.options?.length || field.type === "boolean") {
    const options = field.options?.length ? field.options : ["true", "false"];
    return (
      <Select disabled={disabled} onValueChange={onChange} value={value}>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "json") {
    return (
      <TemplateBadgeTextarea
        disabled={disabled}
        id={id}
        onChange={onChange}
        placeholder={field.example || "JSON value"}
        rows={3}
        value={value}
      />
    );
  }

  return (
    <TemplateBadgeInput
      disabled={disabled}
      id={id}
      onChange={onChange}
      placeholder={field.example || "Value or {{ to insert from a step"}
      value={value}
    />
  );
}

/**
 * Form for a Composio tool, generated from the tool's input schema.
 * Each field is stored on the node as arg__<name>.
 */
export function ComposioToolConfig({
  config,
  onUpdateConfig,
  disabled,
}: ComposioToolConfigProps) {
  const toolSlug = (config.toolSlug as string) || "";
  const [tool, setTool] = useState<GetComposioToolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (!toolSlug) {
      return;
    }
    let cancelled = false;
    setTool(null);
    setError(null);
    composioClient
      .tool(toolSlug)
      .then((data) => {
        if (!cancelled) {
          setTool(data);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Could not load the tool"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toolSlug]);

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!tool) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading fields...
      </div>
    );
  }

  const required = tool.fields.filter((field) => field.required);
  const optional = tool.fields.filter((field) => !field.required);

  const renderField = (field: ComposioToolField) => {
    const key = `${COMPOSIO_ARGUMENT_PREFIX}${field.name}`;
    return (
      <div className="space-y-2" key={field.name}>
        <Label className="ml-1" htmlFor={`composio-${field.name}`}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <FieldInput
          disabled={disabled}
          field={field}
          onChange={(value) => onUpdateConfig(key, value)}
          value={(config[key] as string) || ""}
        />
        {field.description && (
          <p className="ml-1 line-clamp-3 text-muted-foreground text-xs leading-snug">
            {field.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {tool.description && (
        <p className="ml-1 text-muted-foreground text-xs leading-relaxed">
          {tool.description}
        </p>
      )}
      {required.map(renderField)}
      {tool.fields.length === 0 && (
        <p className="ml-1 text-muted-foreground text-sm">
          This action needs no input.
        </p>
      )}
      {optional.length > 0 && (
        <>
          <button
            className="ml-1 flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
            onClick={() => setShowOptional((value) => !value)}
            type="button"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                showOptional && "rotate-180"
              )}
            />
            {showOptional ? "Hide" : "Show"} {optional.length} optional field
            {optional.length === 1 ? "" : "s"}
          </button>
          {showOptional && optional.map(renderField)}
        </>
      )}
    </div>
  );
}
