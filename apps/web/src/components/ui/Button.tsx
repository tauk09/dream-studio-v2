import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "mint";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#6858F5] text-white hover:bg-[#5544E4] active:scale-[0.99] shadow-sm shadow-[#6858F5]/20 disabled:bg-[#6858F5]/45",
  secondary:
    "bg-white text-[#17182B] border border-[#E6E8F0] hover:bg-[#F7F8FC] hover:border-[#D5D8E5] disabled:opacity-50",
  ghost:
    "bg-transparent text-[#70758B] hover:text-[#17182B] hover:bg-[#EEF0FF]/60 disabled:opacity-40",
  danger:
    "bg-[#E75566] text-white hover:bg-[#D44455] shadow-sm disabled:opacity-50",
  mint:
    "bg-[#32CDB5] text-[#0E2A26] font-semibold hover:bg-[#27BA9F] shadow-sm disabled:opacity-50"
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2.5"
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
