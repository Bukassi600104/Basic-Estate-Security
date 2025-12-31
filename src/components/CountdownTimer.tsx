"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  expiresAt: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  percentage: number;
  isExpired: boolean;
  display: string;
}

function calculateTimeLeft(expiresAt: string, totalDuration: number): TimeLeft {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      percentage: 0,
      isExpired: true,
      display: "Expired",
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const percentage = Math.min((diff / totalDuration) * 100, 100);

  let display = "";
  if (hours > 0) {
    display = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    display = `${minutes}m ${seconds}s`;
  } else {
    display = `${seconds}s`;
  }

  return { hours, minutes, seconds, percentage, isExpired: false, display };
}

const sizes = {
  sm: { ring: 40, stroke: 3, text: "text-xs" },
  md: { ring: 56, stroke: 4, text: "text-sm" },
  lg: { ring: 72, stroke: 5, text: "text-base" },
};

export function CountdownTimer({
  expiresAt,
  size = "md",
  showLabel = true,
}: CountdownTimerProps) {
  // Default 6 hours for guest codes
  const totalDuration = 6 * 60 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(expiresAt, totalDuration)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiresAt, totalDuration));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, totalDuration]);

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (timeLeft.percentage / 100) * circumference;

  // Color based on time remaining
  const getColor = () => {
    if (timeLeft.isExpired) return "#94a3b8"; // slate-400
    if (timeLeft.percentage <= 10) return "#ef4444"; // red-500
    if (timeLeft.percentage <= 25) return "#f59e0b"; // amber-500
    return "#4ade80"; // brand-green
  };

  return (
    <div className="flex items-center gap-3">
      <div className="countdown-ring" style={{ width: ring, height: ring }}>
        <svg width={ring} height={ring}>
          <circle
            className="background"
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            className="progress"
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            style={{
              stroke: getColor(),
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold ${text}`}
          style={{ color: getColor() }}
        >
          {timeLeft.isExpired ? "!" : `${timeLeft.hours}h`}
        </span>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold text-slate-900 ${text}`}>
            {timeLeft.display}
          </span>
          <span className="text-xs text-slate-500">
            {timeLeft.isExpired ? "Code expired" : "remaining"}
          </span>
        </div>
      )}
    </div>
  );
}
