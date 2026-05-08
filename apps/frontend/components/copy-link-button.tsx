// @ts-nocheck
/**
 * CopyLinkButton — small button that copies window.location.href and shows a toast.
 * Place in drawer/modal headers.
 */

import { Link } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyLinkButtonProps {
  /** Override the URL to copy. Defaults to window.location.href */
  url?: string;
  /** Extra className for the button */
  className?: string;
}

export function CopyLinkButton({ url, className = "" }: CopyLinkButtonProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const link = url ?? window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link copiado.",
        description: link,
        duration: 2500,
      });
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20 ${className}`}
            aria-label="Copiar link"
          >
            <Link className="h-3 w-3" />
            Copiar link
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Copiar link direto para este registro</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
