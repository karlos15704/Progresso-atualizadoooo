import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "outline";
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  hoverable = false,
  ...props
}) => {
  const variantStyles = {
    default:
      "bg-slate-900/90 border border-slate-800 shadow-xl text-slate-100 backdrop-blur-md",
    glass:
      "bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-slate-100",
    gradient:
      "bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-500/20 shadow-2xl text-slate-100",
    outline:
      "bg-transparent border border-slate-800 text-slate-100",
  };

  return (
    <div
      className={cn(
        "rounded-3xl p-6 transition-all duration-300 relative text-left",
        variantStyles[variant],
        hoverable && "hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-600/10 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  badge,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 shadow-xl hover:shadow-2xl hover:shadow-blue-600/10 backdrop-blur-xl text-left space-y-3 relative overflow-hidden group",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          {title}
        </span>
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
          {value}
        </span>

        {trend && (
          <span
            className={cn(
              "text-[10px] font-extrabold px-2 py-0.5 rounded-full border font-mono",
              trend.isPositive !== false
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          {subtitle && <span>{subtitle}</span>}
          {badge && (
            <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
