import React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variantClasses = {
    text: "h-3.5 w-full rounded-md",
    circular: "rounded-full shrink-0",
    rectangular: "rounded-xl w-full",
    card: "h-32 w-full rounded-3xl",
  };

  return (
    <div
      className={cn(
        "bg-slate-800/60 animate-pulse border border-slate-800/40",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};
