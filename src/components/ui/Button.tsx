import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning" | "link" | "icon";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer";

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 border border-blue-500/20",
      secondary:
        "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm",
      outline:
        "bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-600",
      ghost:
        "bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white border border-transparent",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 border border-rose-500/30",
      success:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border border-emerald-500/30",
      warning:
        "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 border border-amber-500/30",
      link:
        "bg-transparent text-blue-400 hover:text-blue-300 underline underline-offset-4 border-none p-0 shadow-none",
      icon:
        "p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl shadow-sm",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-[11px] rounded-xl gap-1.5",
      md: "px-4 py-2.5 text-xs rounded-xl gap-2",
      lg: "px-6 py-3.5 text-sm rounded-2xl gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          variant !== "icon" && sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
