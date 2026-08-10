import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "primary" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "primary",
  size = "sm",
  dot = false,
  ...props
}) => {
  const variantClasses = {
    primary: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    danger: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    info: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    neutral: "bg-slate-800/60 border-slate-700/50 text-slate-300",
  };

  const dotClasses = {
    primary: "bg-blue-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    info: "bg-cyan-400",
    neutral: "bg-slate-400",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[11px]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider rounded-full border font-mono select-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", dotClasses[variant])} />}
      {children}
    </span>
  );
};
