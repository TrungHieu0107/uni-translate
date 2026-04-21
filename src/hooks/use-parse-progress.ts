import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

export interface ParseProgress {
  file_name: string;
  sheets_done: number;
  sheets_total: number;
  current_sheet: string;
  percent: number;
}

export function useParseProgress() {
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isActiveRef = useRef(false);

  useEffect(() => {
    // Listen to Tauri events from Rust
    const unlisten = listen<ParseProgress>("parse-progress", (event) => {
      if (isActiveRef.current) {
        setProgress(event.payload);
        setIsLoading(true);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const startProgress = () => {
    isActiveRef.current = true;
    setIsLoading(true);
  };

  const resetProgress = () => {
    isActiveRef.current = false;
    setProgress(null);
    setIsLoading(false);
  };

  return { progress, isLoading, startProgress, resetProgress };
}
