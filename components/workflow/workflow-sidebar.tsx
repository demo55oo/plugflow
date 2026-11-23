"use client";

import { useAtomValue, useSetAtom } from "jotai";
import {
  ArrowLeft,
  Check,
  Code,
  Database,
  GitBranch,
  KeyRound,
  Loader2,
  type LucideIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Sun,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ComposioToolkitSummary } from "@/app/api/composio/toolkits/route";
import type { ComposioToolSummary } from "@/app/api/composio/tools/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COMPOSIO_ACTION_TYPE,
  ComposioClientError,
  composioClient,
} from "@/lib/composio/client";
import { cn } from "@/lib/utils";
import {
  addNodeAtom,
  edgesAtom,
  nodesAtom,
  selectedNodeAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";

const NODE_GAP = 260;
const SEARCH_DELAY_MS = 250;
const RETURN_TOOLKIT_KEY = "plugflow:return-toolkit";

type CoreStep = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  actionType: string;
};

const CORE_STEPS: CoreStep[] = [
  {
    id: "http",
    label: "HTTP Request",
    description: "Call any API",
    icon: Zap,
    actionType: "HTTP Request",
  },
  {
    id: "condition",
    label: "Condition",
    description: "Branch on a value",
    icon: GitBranch,
    actionType: "Condition",
  },
  {
    id: "database",
    label: "Database Query",
    description: "Run a SQL query",
    icon: Database,
    actionType: "Database Query",
  },
];

function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export type StepPick = {
  label: string;
  description: string;
  config: Record<string, unknown>;
};

/**
 * Adds a step to the right of the selected node (or the last node) and
 * connects it, so the sidebar answers "what happens next?".
 */
function useAddStep() {
  const nodes = useAtomValue(nodesAtom);
  const selectedNodeId = useAtomValue(selectedNodeAtom);
  const addNode = useSetAtom(addNodeAtom);
  const setEdges = useSetAtom(edgesAtom);

  return useCallback(
    (data: StepPick) => {
      const realNodes = nodes.filter((node) => node.type !== "add");
      const anchor =
        realNodes.find((node) => node.id === selectedNodeId) ??
        realNodes.reduce<WorkflowNode | undefined>(
          (rightmost, node) =>
            !rightmost || node.position.x > rightmost.position.x
              ? node
              : rightmost,
          undefined
        );

      const id = nanoid();

      // Add the edge first: addNode saves the workflow, and that single
      // save then includes both the node and its connection.
      if (anchor) {
        setEdges((edges) => [
          ...edges,
          { id: nanoid(), source: anchor.id, target: id, type: "animated" },
        ]);
      }

      addNode({
        id,
        type: "action",
        position: anchor
          ? { x: anchor.position.x + NODE_GAP, y: anchor.position.y }
          : { x: 0, y: 0 },
        data: {
          label: data.label,
          description: data.description,
          type: "action",
          config: data.config,
          status: "idle",
        },
      });
    },
    [nodes, selectedNodeId, addNode, setEdges]
  );
}

const itemClass =
  "flex w-full select-none items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 hover:bg-accent/60 active:scale-[0.97]";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 px-3 font-semibold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
      {children}
    </p>
  );
}

function AppLogo({ logo, name }: { logo?: string; name: string }) {
  if (!logo) {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <Plug className="size-3.5 text-muted-foreground" />
      </div>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: remote logos from Composio, sizes are fixed
    <img
      alt={name}
      className="size-6 shrink-0 rounded-md bg-white object-contain p-0.5"
      height={24}
      loading="lazy"
      src={logo}
      width={24}
    />
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser; render the same markup as the
  // server until mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-accent/30 px-3 py-2 text-muted-foreground text-sm transition-all duration-200 hover:bg-accent/60 hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      <Icon className="size-4" />
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

function MissingKey({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!apiKey.trim()) {
      return;
    }
    setSaving(true);
    try {
      await composioClient.saveKey(apiKey.trim());
      toast.success("Composio connected");
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the key"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-accent/30 p-3">
      <div className="flex items-center gap-2 font-medium text-sm">
        <KeyRound className="size-4" />
        Add your Composio key
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        One key unlocks 1,000+ apps. Get it free at{" "}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://platform.composio.dev"
          rel="noopener noreferrer"
          target="_blank"
        >
          platform.composio.dev
        </a>
        .
      </p>
      <Input
        className="h-8 text-sm"
        onChange={(event) => setApiKey(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            save();
          }
        }}
        placeholder="ak_..."
        type="password"
        value={apiKey}
      />
      <Button
        className="w-full"
        disabled={saving || !apiKey.trim()}
        onClick={save}
        size="sm"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save key"}
      </Button>
    </div>
  );
}

function ToolkitTools({
  toolkit,
  onBack,
  onPick,
}: {
  toolkit: ComposioToolkitSummary;
  onBack: () => void;
  onPick: (step: StepPick) => void;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [tools, setTools] = useState<ComposioToolSummary[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(
    toolkit.noAuth ? true : null
  );
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTools(null);
    composioClient
      .tools(toolkit.slug, debouncedSearch)
      .then((data) => {
        if (!cancelled) {
          setTools(data.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTools([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toolkit.slug, debouncedSearch]);

  const refreshConnection = useCallback(() => {
    if (toolkit.noAuth) {
      return;
    }
    composioClient
      .isConnected(toolkit.slug)
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false));
  }, [toolkit.slug, toolkit.noAuth]);

  useEffect(() => {
    refreshConnection();
    // Re-check when the user comes back from the Composio connect page
    window.addEventListener("focus", refreshConnection);
    return () => window.removeEventListener("focus", refreshConnection);
  }, [refreshConnection]);

  const connect = async () => {
    setConnecting(true);
    try {
      const { redirectUrl } = await composioClient.connect(
        toolkit.slug,
        window.location.href
      );
      // Remember the open app so the panel returns to it after authorizing
      try {
        sessionStorage.setItem(RETURN_TOOLKIT_KEY, JSON.stringify(toolkit));
      } catch {
        // Storage can be unavailable; the panel then opens on the app list
      }
      // Go to Composio's connect page in this tab. A new tab opened after a
      // network call is blocked as a pop-up by most browsers.
      window.location.assign(redirectUrl);
    } catch (error) {
      setConnecting(false);
      toast.error(
        error instanceof Error ? error.message : "Could not start connecting"
      );
    }
  };

  const addTool = async (tool: ComposioToolSummary) => {
    let integrationId: string | undefined;
    try {
      integrationId = await composioClient.integrationId();
    } catch {
      integrationId = undefined;
    }
    onPick({
      label: tool.name,
      description: toolkit.name,
      config: {
        actionType: COMPOSIO_ACTION_TYPE,
        toolSlug: tool.slug,
        toolkitSlug: toolkit.slug,
        toolkitName: toolkit.name,
        toolkitLogo: toolkit.logo,
        ...(integrationId ? { integrationId } : {}),
      },
    });
  };

  return (
    <>
      <div className="space-y-2 border-border/50 border-b p-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="Back to apps"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>
          <AppLogo logo={toolkit.logo} name={toolkit.name} />
          <span className="min-w-0 flex-1 truncate font-medium text-sm">
            {toolkit.name}
          </span>
          {connected === true && (
            <span className="flex items-center gap-1 text-green-600 text-xs dark:text-green-400">
              <Check className="size-3.5" />
              Connected
            </span>
          )}
          {connected === false && (
            <Button
              disabled={connecting}
              onClick={connect}
              size="sm"
              variant="outline"
            >
              {connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${toolkit.name} actions...`}
            value={search}
          />
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {tools === null && (
          <div className="flex justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {tools?.length === 0 && (
          <p className="px-3 py-6 text-center text-muted-foreground text-xs">
            No actions found
          </p>
        )}
        {tools?.map((tool) => (
          <button
            className={cn(itemClass, "items-start")}
            key={tool.slug}
            onClick={() => addTool(tool)}
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{tool.name}</span>
              {tool.description && (
                <span className="line-clamp-2 text-muted-foreground text-xs leading-snug">
                  {tool.description}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function AppList({
  onSelect,
  onPick,
  showCore,
}: {
  onSelect: (toolkit: ComposioToolkitSummary) => void;
  onPick: (step: StepPick) => void;
  showCore: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [toolkits, setToolkits] = useState<ComposioToolkitSummary[] | null>(
    null
  );
  const [missingKey, setMissingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadToken forces a refetch after the key is saved
  useEffect(() => {
    let cancelled = false;
    setError(null);
    composioClient
      .toolkits(debouncedSearch)
      .then((data) => {
        if (!cancelled) {
          setToolkits(data.items);
          setMissingKey(false);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setToolkits([]);
        if (
          caught instanceof ComposioClientError &&
          caught.code === "missing_key"
        ) {
          setMissingKey(true);
        } else {
          setError(
            caught instanceof Error ? caught.message : "Could not load apps"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, reloadToken]);

  const query = search.trim().toLowerCase();
  const coreSteps = showCore
    ? CORE_STEPS.filter((step) => step.label.toLowerCase().includes(query))
    : [];

  return (
    <>
      <div className="border-border/50 border-b p-3">
        <p className="mb-2 font-medium text-sm">
          {showCore ? "What happens next?" : "Choose an app"}
        </p>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps and steps..."
            value={search}
          />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {coreSteps.length > 0 && (
          <div>
            <SectionLabel>Core</SectionLabel>
            <div className="space-y-0.5">
              {coreSteps.map((step) => (
                <button
                  className={itemClass}
                  key={step.id}
                  onClick={() =>
                    onPick({
                      label: step.label,
                      description: step.description,
                      config: { actionType: step.actionType },
                    })
                  }
                  type="button"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
                    <step.icon className="size-3.5" />
                  </div>
                  <span className="flex-1">{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <SectionLabel>Apps</SectionLabel>
          {missingKey && (
            <MissingKey onSaved={() => setReloadToken((value) => value + 1)} />
          )}
          {error && (
            <p className="px-3 py-2 text-destructive text-xs">{error}</p>
          )}
          {toolkits === null && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {toolkits?.length === 0 && !missingKey && !error && (
            <p className="px-3 py-4 text-center text-muted-foreground text-xs">
              No apps found
            </p>
          )}
          <div className="space-y-0.5">
            {toolkits?.map((toolkit) => (
              <button
                className={itemClass}
                key={toolkit.slug}
                onClick={() => onSelect(toolkit)}
                type="button"
              >
                <AppLogo logo={toolkit.logo} name={toolkit.name} />
                <span className="min-w-0 flex-1 truncate">{toolkit.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toolkit.toolsCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Browse Composio apps and their actions. Used by the steps panel on the
 * left and by the action picker in the properties panel on the right.
 */
export function StepBrowser({
  onPick,
  showCore = false,
}: {
  onPick: (step: StepPick) => void;
  showCore?: boolean;
}) {
  const [toolkit, setToolkit] = useState<ComposioToolkitSummary | null>(null);

  // Reopen the app the user was connecting when they come back from Composio
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(RETURN_TOOLKIT_KEY);
      if (saved) {
        sessionStorage.removeItem(RETURN_TOOLKIT_KEY);
        setToolkit(JSON.parse(saved) as ComposioToolkitSummary);
      }
    } catch {
      // Ignore unreadable storage
    }
  }, []);

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-0 flex-1 flex-col"
        exit={{ opacity: 0, x: toolkit ? -12 : 12 }}
        initial={{ opacity: 0, x: toolkit ? 12 : -12 }}
        key={toolkit?.slug ?? "apps"}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {toolkit ? (
          <ToolkitTools
            onBack={() => setToolkit(null)}
            onPick={onPick}
            toolkit={toolkit}
          />
        ) : (
          <AppList onPick={onPick} onSelect={setToolkit} showCore={showCore} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function WorkflowSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const addStep = useAddStep();

  if (collapsed) {
    return (
      <div className="absolute top-16 left-4 z-10 hidden md:block">
        <Button
          aria-label="Open steps panel"
          className="border"
          onClick={() => setCollapsed(false)}
          size="icon"
          variant="secondary"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel absolute top-16 bottom-20 left-4 z-10 hidden w-72 flex-col overflow-hidden rounded-2xl md:flex"
      initial={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="flex items-center gap-1.5 font-semibold text-muted-foreground text-xs">
          <Code className="size-3.5" />
          Steps
        </span>
        <button
          aria-label="Collapse steps panel"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          onClick={() => setCollapsed(true)}
          type="button"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <StepBrowser onPick={addStep} showCore />
      <div className="border-border/50 border-t p-3">
        <ThemeToggle />
      </div>
    </motion.aside>
  );
}
