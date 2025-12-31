"use client";

import Image from "next/image";

type LogoSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<LogoSize, { width: number; height: number; text: string }> = {
  sm: { width: 32, height: 32, text: "text-lg" },
  md: { width: 40, height: 40, text: "text-xl" },
  lg: { width: 48, height: 48, text: "text-2xl" },
  xl: { width: 64, height: 64, text: "text-3xl" },
};

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const { width, height, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/images/logo.jpg"
        alt="Basic Security Logo"
        width={width}
        height={height}
        className="rounded-xl"
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-brand-navy ${text}`}>
            Basic
          </span>
          <span className={`-mt-1 font-bold tracking-tight text-brand-green ${text}`}>
            Security
          </span>
        </div>
      )}
    </div>
  );
}
