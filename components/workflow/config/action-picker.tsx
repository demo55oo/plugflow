"use client";

import { useState } from "react";
import {
  StepBrowser,
  type StepPick,
} from "@/components/workflow/workflow-sidebar";
import { cn } from "@/lib/utils";
import { ActionGrid } from "./action-grid";

type ActionPickerProps = {
  onSelectAction: (actionType: string) => void;
  onPickStep: (step: StepPick) => void;
  disabled?: boolean;
  isNewlyCreated?: boolean;
};

type PickerTab = "apps" | "built-in";

const TABS: { id: PickerTab; label: string }[] = [
  { id: "apps", label: "Apps" },
  { id: "built-in", label: "Built-in" },
];

/**
 * Action picker for a new step: Composio apps and their actions, or the
 * built-in actions that ship with the builder.
 */
export function ActionPicker({
  onSelectAction,
  onPickStep,
  disabled,
  isNewlyCreated,
}: ActionPickerProps) {
  const [tab, setTab] = useState<PickerTab>("apps");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {TABS.map((item) => (
          <button
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-all duration-200",
              tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "apps" ? (
        <div className="-mx-4 flex min-h-0 flex-1 flex-col">
          <StepBrowser onPick={onPickStep} />
        </div>
      ) : (
        <ActionGrid
          disabled={disabled}
          isNewlyCreated={isNewlyCreated}
          onSelectAction={onSelectAction}
        />
      )}
    </div>
  );
}
