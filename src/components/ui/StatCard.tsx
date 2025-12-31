"use client";

import { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon;
  trend?: string | {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  iconColor?: string;
  className?: string;
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

const variantStyles = {
  default: {
    icon: "bg-slate-100 text-brand-navy group-hover:bg-brand-navy/10",
    value: "text-slate-900",
  },
  success: {
    icon: "bg-green-100 text-green-600 group-hover:bg-green-200",
    value: "text-green-600",
  },
  warning: {
    icon: "bg-amber-100 text-amber-600 group-hover:bg-amber-200",
    value: "text-amber-600",
  },
  error: {
    icon: "bg-rose-100 text-rose-600 group-hover:bg-rose-200",
    value: "text-rose-600",
  },
};

export function StatCard({
  title,
  value,
  suffix = "",
  prefix = "",
  icon: Icon,
  trend,
  description,
  className = "",
  loading = false,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className={`stat-card ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className={`stat-card group ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${styles.value}`}>
            <AnimatedCounter
              end={value}
              prefix={prefix}
              suffix={suffix}
              duration={2000}
            />
          </p>
          {typeof trend === "string" ? (
            <p className="mt-1 text-sm text-slate-500">{trend}</p>
          ) : trend ? (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  trend.isPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500">vs last period</span>
            </div>
          ) : null}
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${styles.icon}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
