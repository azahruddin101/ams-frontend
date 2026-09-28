import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50",
  secondary: "bg-white text-ink border border-line hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  ghost: "text-muted hover:bg-slate-100 disabled:text-slate-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50",
};
// Touch-first: 44px tall on phones, compact from `sm` up.
const SIZES = { sm: "h-11 px-4 text-sm sm:h-8 sm:px-3", md: "h-11 px-4 text-sm sm:h-10", lg: "h-12 px-6 text-base", xl: "h-16 px-8 text-xl" };

export function Button({ variant = "primary", size = "md", loading = false, icon: Icon, className, children, disabled, type = "button", ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed", VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, icon: Icon, className, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn("inline-flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 sm:size-9", className)} {...props}>
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
