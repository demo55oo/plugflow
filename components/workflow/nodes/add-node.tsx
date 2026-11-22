"use client";

import type { NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddNodeData = {
  onClick?: () => void;
};

export function AddNode({ data }: NodeProps & { data?: AddNodeData }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-xl border border-white/40 border-dashed bg-white/60 p-8 shadow-[0_10px_26px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="text-center">
        <h1 className="mb-2 font-bold text-3xl">Plugflow</h1>
        <p className="text-muted-foreground text-sm">
          Open-source workflow automation with 1,000+ integrations through
          Composio
        </p>
      </div>
      <Button className="gap-2 shadow-lg" onClick={data.onClick} size="default">
        <Plus className="size-4" />
        Add a Step
      </Button>
    </div>
  );
}
