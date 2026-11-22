import { Sparkles } from "lucide-react";

interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6858F5] to-[#5544E4] text-white shadow-sm shadow-[#6858F5]/25">
        <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#32CDB5]" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[16px] font-bold tracking-tight text-[#17182B]">
            Dream Studio
          </span>
          <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-[#6858F5]">
            2.0 CREATIVE
          </span>
        </span>
      )}
    </span>
  );
}
