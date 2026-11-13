import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "accent";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "touch-target inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:translate-y-px",
  secondary:
    "bg-muted text-foreground hover:bg-muted/70 active:translate-y-px",
  outline:
    "border border-border bg-card text-foreground shadow-sm hover:border-primary/40 hover:bg-muted/40 active:translate-y-px",
  ghost: "text-foreground hover:bg-muted/70 active:translate-y-px",
  danger:
    "bg-danger text-danger-foreground shadow-sm hover:bg-danger/90 hover:shadow-md active:translate-y-px",
  accent:
    "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 hover:shadow-md active:translate-y-px",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11 shrink-0 p-0",
};

export function buttonCn(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonCn(variant, size, className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);
