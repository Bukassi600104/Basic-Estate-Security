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
    icon: "bg-violet-50 text-violet-700 group-hover:bg-violet-100",
    value: "text-slate-950",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
    value: "text-emerald-700",
  },
  warning: {
    icon: "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
    value: "text-amber-700",
  },
  error: {
    icon: "bg-rose-50 text-rose-700 group-hover:bg-rose-100",
    value: "text-rose-700",
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
      <div className={`relative overflow-hidden rounded-lg border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)] ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-lg border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,0.08)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_80px_rgba(76,29,149,0.12)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-700 via-emerald-400 to-violet-700" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">{title}</p>
          <p className={`mt-3 text-4xl font-black ${styles.value}`}>
            <AnimatedCounter
              end={value}
              prefix={prefix}
              suffix={suffix}
              duration={2000}
            />
          </p>
          {typeof trend === "string" ? (
            <p className="mt-3 text-sm font-bold text-slate-500">{trend}</p>
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
              <span className="text-xs text-slate-400">vs last period</span>
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
