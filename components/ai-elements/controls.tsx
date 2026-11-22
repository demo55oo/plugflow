"use client";

import { useReactFlow } from "@xyflow/react";
import { useAtom } from "jotai";
import {
  type LucideIcon,
  MapPin,
  MapPinXInside,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showMinimapAtom } from "@/lib/workflow-store";

type ControlButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

const ControlButton = ({ icon: Icon, label, onClick }: ControlButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        className="rounded-md border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
        onClick={onClick}
        size="icon"
        variant="secondary"
      >
        <Icon className="size-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

export const Controls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);

  return (
    <div className="flex flex-row gap-2">
      <ControlButton icon={ZoomIn} label="Zoom in" onClick={() => zoomIn()} />
      <ControlButton
        icon={ZoomOut}
        label="Zoom out"
        onClick={() => zoomOut()}
      />
      <ControlButton
        icon={Maximize2}
        label="Fit to view"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
      />
      <ControlButton
        icon={showMinimap ? MapPin : MapPinXInside}
        label={showMinimap ? "Hide minimap" : "Show minimap"}
        onClick={() => setShowMinimap(!showMinimap)}
      />
    </div>
  );
};
