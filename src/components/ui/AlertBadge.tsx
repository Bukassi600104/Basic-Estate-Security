"use client";

import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

type AlertType = "error" | "warning" | "success" | "info";

interface AlertBadgeProps {
  type: AlertType;
  message: string;
  timestamp?: string;
  className?: string;
}

const config: Record<
  AlertType,
  { icon: typeof AlertCircle; className: string }
> = {
  error: {
    icon: XCircle,
    className: "alert-badge-error",
  },
  warning: {
    icon: AlertTriangle,
    className: "alert-badge-warning",
  },
  success: {
    icon: CheckCircle,
    className: "alert-badge-success",
  },
  info: {
    icon: Info,
    className: "alert-badge-info",
  },
};

export function AlertBadge({
  type,
  message,
  timestamp,
  className = "",
}: AlertBadgeProps) {
  const { icon: Icon, className: typeClassName } = config[type];

  return (
    <div className={`alert-badge ${typeClassName} ${className}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{message}</span>
      {timestamp && (
        <span className="ml-auto text-xs opacity-70">{timestamp}</span>
      )}
    </div>
  );
}

interface AlertListProps {
  alerts: Array<{
    id: string;
    type: AlertType;
    message: string;
    timestamp?: string;
  }>;
  maxVisible?: number;
  className?: string;
}

export function AlertList({ alerts, maxVisible = 5, className = "" }: AlertListProps) {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const remainingCount = alerts.length - maxVisible;

  return (
    <div className={`space-y-2 ${className}`}>
      {visibleAlerts.map((alert) => (
        <AlertBadge
          key={alert.id}
          type={alert.type}
          message={alert.message}
          timestamp={alert.timestamp}
        />
      ))}
      {remainingCount > 0 && (
        <div className="text-center text-xs text-slate-500">
          +{remainingCount} more alerts
        </div>
      )}
    </div>
  );
}
