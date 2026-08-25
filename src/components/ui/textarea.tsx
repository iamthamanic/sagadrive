import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-foreground/20 placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-accent/25 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/25 flex field-sizing-content min-h-24 w-full rounded-lg border bg-input-background px-3.5 py-3 text-base shadow-sm transition-[background-color,border-color,box-shadow,color] outline-none hover:border-foreground/30 hover:bg-muted/20 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
