import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getConnectedPages } from "../../utils/apis/notion/client";
import { NotionCache } from "../../utils/notionCache";

type ThemeType = "light" | "dark";

export default function CreateEmbedPage() {
  const [pages, setPages] = useState<Array<{ id: string; title: string; url?: string }>>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [theme, setTheme] = useState<ThemeType>("light");
  const [isConnected, setIsConnected] = useState(false);

  // Style options
  const [widgetBg, setWidgetBg] = useState<string>("#ffffff");
  const [widgetColor, setWidgetColor] = useState<string>("#111111");
  const [inputWidth, setInputWidth] = useState<number>(320);
  const [inputBorder, setInputBorder] = useState<string>("#d1d5db");
  const [timerColor, setTimerColor] = useState<string>("#ef4444");
  const [timerFontSize, setTimerFontSize] = useState<number>(48);
  const [embedLink, setEmbedLink] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<string>("");
  // Session + account saves
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [savedEmbeds, setSavedEmbeds] = useState<Array<{ id: string; title: string; link: string; createdAt: number }>>([]);
  const [accountSaveMsg, setAccountSaveMsg] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingPages(true);
        const userData = typeof window !== "undefined" ? NotionCache.getUserData() : null;
        const userEmail = userData?.email;
        setIsConnected(!!userData?.accessToken);
        if (!userEmail) {
          setPages([]);
          setSelectedPageId("");
          return;
        }
        const data = await getConnectedPages({ userId: userEmail });
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
  // Check cookie-based session and load saved embeds
  useEffect(() => {
    let mounted = true;
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.isAuthenticated) {
          setIsAuthenticated(true);
          setSessionEmail(data?.email || null);
          fetch('/api/embeds')
            .then((r) => r.json())
            .then((json) => {
              if (!mounted) return;
              setSavedEmbeds(json?.items || []);
            })
            .catch(() => {});
        } else {
          setIsAuthenticated(false);
          setSessionEmail(null);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Theme applies only to preview UI — enforce full-card dark/light styles
  const previewCardStyle: React.CSSProperties = {
    backgroundColor: theme === "dark" ? "#111827" : "#ffffff",
    color: theme === "dark" ? "#f9fafb" : "#111827",
    border: `1px solid ${theme === "dark" ? "#374151" : inputBorder}`,
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
    border: `1px solid ${theme === "dark" ? "#374151" : inputBorder}`,
    borderRadius: 8,
    padding: "8px 12px",
    backgroundColor: theme === "dark" ? "#0a0a0a" : "#ffffff",
    color: theme === "dark" ? "#f5f5f5" : "#111827",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    backgroundColor: theme === "dark" ? "#374151" : "#e5e7eb",
    color: theme === "dark" ? "#f9fafb" : "#111827",
    border: `1px solid ${theme === "dark" ? "#4b5563" : "#d1d5db"}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 500,
  };
  // Save current embedLink to account via API
  const saveToAccount = async () => {
    try {
      setAccountSaveMsg("");
      if (!isAuthenticated || !embedLink) {
        setAccountSaveMsg("Login required or missing link.");
        return;
      }
      const title = pages.find((p) => p.id === selectedPageId)?.title || "Untitled Embed";
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
      const res = await fetch('/api/embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPageId || 'default', title, link: embedLink, config: settings }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAccountSaveMsg(err?.error || 'Failed to save link');
        return;
      }
      const json = await res.json();
      setSavedEmbeds(json?.items || []);
      setAccountSaveMsg('Saved to account.');
    } catch (e) {
      setAccountSaveMsg('Failed to save link');
    }
  };
  const deleteSavedLink = async (link: string) => {
    try {
      const res = await fetch(`/api/embeds?link=${encodeURIComponent(link)}`, { method: 'DELETE' });
      if (!res.ok) return;
      const json = await res.json();
      setSavedEmbeds(json?.items || []);
    } catch (e) {
      // ignore
    }
  };

  return (
    // Only default page styles; theme applied in preview UI only
    <div className={"min-h-screen"}> 
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
              {!isConnected && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-red-600">Not connected to Notion.</span>
                  <Link href="/">
                    <span className="text-xs rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-500">Connect Notion</span>
                  </Link>
                </div>
              )}

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
                  {isAuthenticated && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                        onClick={saveToAccount}
                      >
                        Save Link to Account
                      </button>
                      {accountSaveMsg && <span className="text-xs opacity-70">{accountSaveMsg}</span>}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs opacity-60">Sign in via Notion to save links to your account.</p>
                  )}
                </div>
              )}
            </div>
            {isAuthenticated && (
              <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="mb-3 text-lg font-medium">Saved Embeds</h2>
                {savedEmbeds.length === 0 ? (
                  <p className="text-sm opacity-70">No saved links yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {savedEmbeds.map((item) => (
                      <li key={item.link} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{item.title}</span>
                        <button
                          className="rounded-md bg-neutral-200 px-3 py-1 text-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white"
                          onClick={() => { if (typeof window !== 'undefined') navigator.clipboard.writeText(item.link); }}
                        >
                          Copy
                        </button>
                        <button
                          className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-500"
                          onClick={() => deleteSavedLink(item.link)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
                  <button style={secondaryButtonStyle}>Pause</button>
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