import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

interface RuleHelpProps {
  label: string;
  children: ReactNode;
}

export function RuleHelp({ label, children }: RuleHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} erklären`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => setOpen((current) => !current)}
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[320px] px-3 py-2 text-left leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
