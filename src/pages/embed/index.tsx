import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getConnectedPages } from "../../utils/apis/notion/client";

type ThemeType = "light" | "dark";

export default function CreateEmbedPage() {
  const [pages, setPages] = useState<Array<{ id: string; title: string; url?: string }>>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [theme, setTheme] = useState<ThemeType>("light");

  // Style options
  const [widgetBg, setWidgetBg] = useState<string>("#ffffff");
  const [widgetColor, setWidgetColor] = useState<string>("#111111");
  const [inputWidth, setInputWidth] = useState<number>(320);
  const [inputBorder, setInputBorder] = useState<string>("#d1d5db");
  const [timerColor, setTimerColor] = useState<string>("#ef4444");
  const [timerFontSize, setTimerFontSize] = useState<number>(48);
  const [embedLink, setEmbedLink] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingPages(true);
        const data = await getConnectedPages({ userId: "notion-user" });
        setPages(data.items);
        if (data.items[0]) setSelectedPageId(data.items[0].id);
      } catch (e) {
        console.error("Failed to load Notion pages", e);
      } finally {
        setLoadingPages(false);
      }
    };
    run();
  }, []);

  const containerClasses = useMemo(() => {
    return theme === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900";
  }, [theme]);

  const previewCardStyle: React.CSSProperties = {
    backgroundColor: widgetBg,
    color: widgetColor,
    border: `1px solid ${inputBorder}`,
    borderRadius: 12,
    padding: 16,
    width: 380,
  };

  const timerStyle: React.CSSProperties = {
    color: timerColor,
    fontSize: timerFontSize,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  };

  const inputStyle: React.CSSProperties = {
    width: inputWidth,
    border: `1px solid ${inputBorder}`,
    borderRadius: 8,
    padding: "8px 12px",
    backgroundColor: theme === "dark" ? "#0a0a0a" : "#ffffff",
    color: theme === "dark" ? "#f5f5f5" : "#111827",
  };

  return (
    <div className={`min-h-screen ${containerClasses}`}> 
      <Head>
        <title>Create Embed • Pomodoro for Notion</title>
      </Head>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Create Embed</h1>
            <p className="text-sm opacity-75">Configure the embedded Pomodoro widget for your Notion page.</p>
          </div>
          <Link href="/">
            <span className="inline-flex cursor-pointer items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">Back to Home</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column: Controls */}
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-3 text-lg font-medium">Embed Options</h2>
              {/* Notion Page selection */}
              <label className="block text-sm font-medium mb-1">Notion Page</label>
              <select
                className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
              >
                {loadingPages && <option>Loading pages…</option>}
                {!loadingPages && pages.length === 0 && <option>No pages found</option>}
                {!loadingPages && pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              {/* Theme */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Theme</label>
                <div className="flex gap-3">
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${theme === "light" ? "bg-neutral-200" : "bg-neutral-100"}`}
                    onClick={() => setTheme("light")}
                  >
                    Light
                  </button>
                  <button
                    className={`rounded-md px-3 py-1 text-sm ${theme === "dark" ? "bg-neutral-800 text-white" : "bg-neutral-100"}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Colors and sizes */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Widget background</label>
                  <input type="color" className="h-10 w-16" value={widgetBg} onChange={(e) => setWidgetBg(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Widget color</label>
                  <input type="color" className="h-10 w-16" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Input width</label>
                  <input type="number" className="w-full rounded-md border p-2" min={200} max={600} value={inputWidth} onChange={(e) => setInputWidth(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Input border color</label>
                  <input type="color" className="h-10 w-16" value={inputBorder} onChange={(e) => setInputBorder(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timer color</label>
                  <input type="color" className="h-10 w-16" value={timerColor} onChange={(e) => setTimerColor(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timer font size</label>
                  <input type="number" className="w-full rounded-md border p-2" min={24} max={96} value={timerFontSize} onChange={(e) => setTimerFontSize(Number(e.target.value))} />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  onClick={() => {
                    try {
                      const settings = {
                        pageId: selectedPageId,
                        theme,
                        widgetBg,
                        widgetColor,
                        inputWidth,
                        inputBorder,
                        timerColor,
                        timerFontSize,
                      };
                      if (typeof window !== "undefined") {
                        const key = `EMBED_SETTINGS_${selectedPageId || "default"}`;
                        window.localStorage.setItem(key, JSON.stringify(settings));
                      }
                      // Generate embeddable link (base64 JSON in query)
                      const json = JSON.stringify(settings);
                      const base64 = typeof window !== "undefined" ? window.btoa(json) : Buffer.from(json).toString("base64");
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      const link = `${origin}/embed/widget?c=${encodeURIComponent(base64)}`;
                      setEmbedLink(link);
                      setSaveMsg("Settings saved. Embed link generated.");
                    } catch (e) {
                      console.error("Failed to save settings", e);
                      setSaveMsg("Failed to save settings");
                    }
                  }}
                >
                  Save & Generate Embed Link
                </button>
                {saveMsg && <span className="text-xs opacity-70">{saveMsg}</span>}
              </div>
              {embedLink && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Embed Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      value={embedLink}
                      readOnly
                    />
                    <button
                      className="rounded-md bg-neutral-200 px-3 py-2 text-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(embedLink);
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs opacity-60">Paste this link in a Notion Embed block.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Previews */}
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="mb-3 text-lg font-medium">Start State</h2>
              <div style={previewCardStyle}>
                <div className="mb-3 text-sm opacity-70">Selected Page: {pages.find(p => p.id === selectedPageId)?.title || "None"}</div>
                <input style={inputStyle} placeholder="Task / Notes" />
                <div className="mt-3 flex items-center gap-3">
                  <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Start</button>
                  <span className="text-xs opacity-70">Pomodoro: 25m • Break: 5m</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="mb-3 text-lg font-medium">Timer Running</h2>
              <div style={previewCardStyle}>
                <div style={timerStyle}>24:37</div>
                <div className="mt-3 flex items-center gap-3">
                  <button className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-300">Pause</button>
                  <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Complete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}