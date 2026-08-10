import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, leftIcon, className, disabled, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5 text-left w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300">
            {label}
            {props.required && <span className="text-rose-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-500 pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}

          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full py-3 text-xs font-medium bg-slate-950 border border-slate-800 rounded-xl text-white appearance-none outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pr-10",
              leftIcon ? "pl-11" : "px-4",
              error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3.5 w-4 h-4 text-slate-500 pointer-events-none shrink-0" />
        </div>

        {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
