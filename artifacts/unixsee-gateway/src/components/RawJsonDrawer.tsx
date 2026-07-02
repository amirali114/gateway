import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RawJsonDrawerProps {
  data: unknown;
  label?: string;
  defaultOpen?: boolean;
}

export function RawJsonDrawer({ data, label = "داده خام JSON", defaultOpen = false }: RawJsonDrawerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <span className="ltr-text font-mono text-[10px] bg-border/60 px-1.5 py-0.5 rounded">{"{}"}</span>
          {label}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-2 left-2 p-1.5 rounded bg-border/40 hover:bg-border/80 transition-colors z-10"
            title="کپی"
          >
            {copied
              ? <Check className="w-3 h-3 text-emerald-400" />
              : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
          <pre className={cn(
            "ltr p-4 text-[11px] leading-relaxed overflow-x-auto max-h-64 scrollbar-thin",
            "bg-background/80 text-emerald-300"
          )}>
            {jsonStr}
          </pre>
        </div>
      )}
    </div>
  );
}
