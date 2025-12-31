"use client";

interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function FormContainer({
  children,
  className = "",
  maxWidth = "lg",
}: FormContainerProps) {
  return (
    <div
      className={`
        w-full ${maxWidths[maxWidth]} mx-auto
        max-h-[100dvh] overflow-y-auto
        overscroll-contain scroll-smooth
        px-4 py-6
        ${className}
      `}
      style={{
        // Ensure content doesn't overflow viewport
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  );
}
