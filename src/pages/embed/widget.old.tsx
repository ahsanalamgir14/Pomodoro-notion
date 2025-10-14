import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

interface EmbedSettings {
  pageId?: string;
  theme: "light" | "dark";
  widgetBg: string;
  widgetColor: string;
  inputWidth: number;
  inputBorder: string;
  timerColor: string;
  timerFontSize: number;
}

export default function EmbedWidget() {
  const [config, setConfig] = useState<EmbedSettings | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const c = params.get("c");
      if (c) {
        const json = window.atob(c);
        const obj = JSON.parse(json);
        setConfig(obj);
      }
    } catch (e) {
      console.error("Failed to parse embed config", e);
    }
  }, []);

  const containerClasses = useMemo(() => {
    if (!config) return "bg-white text-neutral-900";
    return config.theme === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900";
  }, [config]);

  const previewCardStyle: React.CSSProperties = useMemo(() => ({
    backgroundColor: config?.widgetBg || "#ffffff",
    color: config?.widgetColor || "#111111",
    border: `1px solid ${config?.inputBorder || "#d1d5db"}`,
    borderRadius: 12,
    padding: 16,
    width: 380,
  }), [config]);

  const timerStyle: React.CSSProperties = useMemo(() => ({
    color: config?.timerColor || "#ef4444",
    fontSize: config?.timerFontSize || 48,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  }), [config]);

  const inputStyle: React.CSSProperties = useMemo(() => ({
    width: config?.inputWidth || 320,
    border: `1px solid ${config?.inputBorder || "#d1d5db"}`,
    borderRadius: 8,
    padding: "8px 12px",
    backgroundColor: config?.theme === "dark" ? "#0a0a0a" : "#ffffff",
    color: config?.theme === "dark" ? "#f5f5f5" : "#111827",
  }), [config]);

  return (
    <div className={`min-h-screen ${containerClasses}`}> 
      <Head>
        <title>Pomodoro Embed Widget</title>
      </Head>
      <div className="mx-auto max-w-md px-4 py-6">
        {!config && (
          <div className="rounded-lg border border-neutral-200 p-4 text-sm opacity-75 dark:border-neutral-800">
            No config provided. Pass base64 config via query param `c`.
          </div>
        )}
        {config && (
          <div style={previewCardStyle}>
            <div className="mb-3 text-xs opacity-70">Notion Page: {config.pageId || "(not set)"}</div>
            {/* Start State */}
            <input style={inputStyle} placeholder="Task / Notes" />
            <div className="mt-3 flex items-center gap-3">
              <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Start</button>
              <span className="text-xs opacity-70">Pomodoro: 25m • Break: 5m</span>
            </div>
            {/* Running state */}
            <div className="mt-4" style={timerStyle}>24:37</div>
            <div className="mt-3 flex items-center gap-3">
              <button className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-300">Pause</button>
              <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Complete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}