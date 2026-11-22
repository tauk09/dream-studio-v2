import type { ReactNode } from "react";

type Tone = "brand" | "mint" | "amber" | "danger" | "neutral" | "success";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  brand: "bg-[#EEF0FF] text-[#5544E4] border-[#DCDFFF]",
  mint: "bg-[#E6FAF6] text-[#117A69] border-[#B9EFE5]",
  amber: "bg-[#FFF5E8] text-[#A95A00] border-[#FFE0B8]",
  danger: "bg-[#FEECEF] text-[#B82839] border-[#FBC9D0]",
  success: "bg-[#E8F8F2] text-[#14795C] border-[#BCEAD8]",
  neutral: "bg-[#F2F3F8] text-[#575C72] border-[#E6E8F0]"
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
