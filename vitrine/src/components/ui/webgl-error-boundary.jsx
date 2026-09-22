"use client";;
import { cn } from "@/lib/utils";
import * as React from "react";

export class WebGLErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <WebGLFallback />;
    }
    return this.props.children;
  }
}

export function WebGLFallback({
  className,
  message = "Interactive WebGL content is unavailable on this device/browser."
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900 px-4 text-center text-sm text-white/75",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p>{message}</p>
    </div>
  );
}
