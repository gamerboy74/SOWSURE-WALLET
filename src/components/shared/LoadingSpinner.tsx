import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  text?: string;
  minDuration?: number;
  immediate?: boolean; // Add this prop for immediate loading without delay
}

function LoadingSpinner({
  fullScreen = false,
  text = "Loading...",
  minDuration = 0,
  immediate = false, // For cases where we want to show loader right away
}: LoadingSpinnerProps) {
  const [shouldShow, setShouldShow] = useState(immediate || minDuration === 0);

  useEffect(() => {
    if (!immediate && minDuration > 0) {
      const timer = setTimeout(() => setShouldShow(true), minDuration);
      return () => clearTimeout(timer);
    }
  }, [minDuration, immediate]);

  if (!shouldShow) return null;

  const baseClasses = "flex items-center justify-center";
  const fullScreenClasses = fullScreen
    ? "fixed inset-0 bg-white/90 backdrop-blur-sm z-50"
    : "";

  return (
    <div className={`${baseClasses} ${fullScreenClasses}`}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
