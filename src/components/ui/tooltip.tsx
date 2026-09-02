"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip@1.1.8";

import { cn } from "./utils";
import { useTooltipPin } from "./useTooltipPin";

type TooltipPinContextValue = {
  pinOnClick: boolean;
  pinned: boolean;
  togglePin: () => void;
  dismiss: () => void;
};

const TooltipPinContext = React.createContext<TooltipPinContextValue | null>(
  null,
);

function useTooltipPinContext() {
  return React.useContext(TooltipPinContext);
}

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  /** Hover preview + click-to-pin. Set false for classic hover-only tooltips. */
  pinOnClick?: boolean;
};

function Tooltip({
  pinOnClick = true,
  open,
  onOpenChange,
  defaultOpen,
  disableHoverableContent,
  children,
  ...props
}: TooltipProps) {
  const pin = useTooltipPin({ open, onOpenChange, defaultOpen });

  if (!pinOnClick) {
    return (
      <TooltipProvider>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          open={open}
          onOpenChange={onOpenChange}
          defaultOpen={defaultOpen}
          disableHoverableContent={disableHoverableContent}
          {...props}
        >
          {children}
        </TooltipPrimitive.Root>
      </TooltipProvider>
    );
  }

  const pinContext: TooltipPinContextValue = {
    pinOnClick,
    pinned: pin.pinned,
    togglePin: pin.togglePin,
    dismiss: pin.dismiss,
  };

  return (
    <TooltipProvider disableHoverableContent={!pin.pinned}>
      <TooltipPinContext.Provider value={pinContext}>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          open={pin.open}
          onOpenChange={pin.onOpenChange}
          disableHoverableContent={!pin.pinned}
          {...props}
        >
          {children}
        </TooltipPrimitive.Root>
      </TooltipPinContext.Provider>
    </TooltipProvider>
  );
}

function TooltipTrigger({
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const pinContext = useTooltipPinContext();

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onClick={(event) => {
        onClick?.(event);
        if (pinContext?.pinOnClick && !event.defaultPrevented) {
          pinContext.togglePin();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          pinContext?.pinOnClick &&
          !event.defaultPrevented &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          pinContext.togglePin();
        }
      }}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  onPointerDownOutside,
  onEscapeKeyDown,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const pinContext = useTooltipPinContext();

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event);
          if (pinContext?.pinOnClick && pinContext.pinned && !event.defaultPrevented) {
            pinContext.dismiss();
          }
        }}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          if (pinContext?.pinOnClick && pinContext.pinned && !event.defaultPrevented) {
            pinContext.dismiss();
          }
        }}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  useTooltipPin,
};
