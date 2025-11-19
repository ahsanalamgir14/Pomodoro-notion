import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getConnectedPages } from "../../utils/apis/notion/client";
import { NotionCache } from "../../utils/notionCache";
import { trpc } from "../../utils/trpc";
import QuestSelection from "../../Components/QuestSelection";
import NotionTags from "../../Components/NotionTags";

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
  // Data selections
  const [selectedTaskDbId, setSelectedTaskDbId] = useState<string>("");
  const [selectedSessionDbId, setSelectedSessionDbId] = useState<string>("");
  const [lockDbSelections, setLockDbSelections] = useState<boolean>(true);

  // Track Notion connection only
  useEffect(() => {
    const userData = typeof window !== "undefined" ? NotionCache.getUserData() : null;
    setIsConnected(!!userData?.accessToken);
  }, []);

  // Fetch Notion pages using session email (fallback to cached email)
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingPages(true);
        const cacheEmail = typeof window !== "undefined" ? NotionCache.getUserData()?.email : null;
        const email = sessionEmail || cacheEmail;
        if (!email) {
          setPages([]);
          setSelectedPageId("");
          return;
        }
        const data = await getConnectedPages({ userId: email });
        setPages(data.items);
        if (data.items[0]) setSelectedPageId(data.items[0].id);
      } catch (e) {
        console.error("Failed to load Notion pages", e);
      } finally {
        setLoadingPages(false);
      }
    };
    run();
  }, [sessionEmail]);

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

  // Databases and tasks for selections
  const userIdentifier = sessionEmail || (typeof window !== "undefined" ? NotionCache.getUserData()?.email : null) || "notion-user";
  const { data: dbs } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier },
    { refetchOnWindowFocus: false, retry: false }
  );
  useEffect(() => {
    if (dbs?.databases?.results?.length) {
      const firstId = dbs.databases.results[0].id;
      setSelectedTaskDbId((prev) => prev || firstId);
      const trackingCandidate = dbs.databases.results.find((d: any) => {
        const name = (d?.title && d?.title[0]?.plain_text) || "";
        return /time|tracking|timesheet|log/i.test(name);
      })?.id || firstId;
      setSelectedSessionDbId((prev) => prev || trackingCandidate);
    }
  }, [dbs]);

  const { data: taskDbDetail } = trpc.private.getDatabaseDetail.useQuery(
    { databaseId: selectedTaskDbId, email: userIdentifier },
    { enabled: !!selectedTaskDbId, refetchOnWindowFocus: false, retry: false }
  );
  const { data: sessionDbDetail } = trpc.private.getDatabaseDetail.useQuery(
    { databaseId: selectedSessionDbId, email: userIdentifier },
    { enabled: !!selectedSessionDbId, refetchOnWindowFocus: false, retry: false }
  );

  const { data: taskDbQuery } = trpc.private.queryDatabase.useQuery(
    { databaseId: selectedTaskDbId, email: userIdentifier },
    { enabled: !!selectedTaskDbId, refetchOnWindowFocus: false, retry: false }
  );

  const previewTaskItems = useMemo(() => {
    const results: any[] = (taskDbQuery as any)?.database?.results || [];
    return results.map((r: any) => {
      const props: Record<string, any> = r?.properties || {};
      const titlePropName = Object.entries(props).find(([, p]: any) => p?.type === "title")?.[0] || "Name";
      const titleParts = props?.[titlePropName]?.title || [];
      const title = Array.isArray(titleParts)
        ? titleParts.map((t: any) => t?.plain_text || t?.text?.content || "").join("").trim()
        : "Untitled";
      return { id: r?.id as string, title: title || "Untitled" };
    });
  }, [taskDbQuery]);

  const [previewSelectedTaskId, setPreviewSelectedTaskId] = useState<string>("");
  const [previewSelectedTaskTitle, setPreviewSelectedTaskTitle] = useState<string>("");
  const [previewQuestChips, setPreviewQuestChips] = useState<Array<{ label: string; value: string }>>([]);
  const [previewSelectedQuests, setPreviewSelectedQuests] = useState<Array<{ label: string; value: string }>>([]);
  const [previewSelectedTags, setPreviewSelectedTags] = useState<Array<{ label: string; value: string; color: string }>>([]);
  useEffect(() => {
    if (previewTaskItems.length > 0) {
      setPreviewSelectedTaskId((prev) => prev || previewTaskItems[0].id);
      setPreviewSelectedTaskTitle((prev) => prev || previewTaskItems[0].title);
    } else {
      setPreviewSelectedTaskId("");
      setPreviewSelectedTaskTitle("");
    }
  }, [previewTaskItems]);

  const previewQuestsRelProp = useMemo(() => {
    try {
      const results: any[] = (taskDbQuery as any)?.database?.results || [];
      const page = results.find((r: any) => r?.id === previewSelectedTaskId);
      const props: Record<string, any> = page?.properties || {};
      const rel = props?.["Quests"]?.type === "relation"
        ? "Quests"
        : props?.["Quest"]?.type === "relation"
          ? "Quest"
          : Object.entries(props).find(([k, p]: any) => k?.toLowerCase?.().includes("quest") && p?.type === "relation")?.[0];
      return rel || "Quests";
    } catch (e) {
      return "Quests";
    }
  }, [taskDbQuery, previewSelectedTaskId]);
  useEffect(() => {
    try {
      const results: any[] = (taskDbQuery as any)?.database?.results || [];
      const page = results.find((r: any) => r?.id === previewSelectedTaskId);
      const props: Record<string, any> = page?.properties || {};
      const questsRelProp = props?.["Quests"]?.type === "relation"
        ? "Quests"
        : props?.["Quest"]?.type === "relation"
          ? "Quest"
          : Object.entries(props).find(([k, p]: any) => k?.toLowerCase?.().includes("quest") && p?.type === "relation")?.[0];
      if (!questsRelProp) { setPreviewQuestChips([]); if (previewSelectedQuests.length === 0) setPreviewSelectedQuests([]); return; }
      const qs = new URLSearchParams({ userId: "notion-user", pageId: previewSelectedTaskId, relationName: questsRelProp });
      fetch(`/api/notion/page-relations?${qs.toString()}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const items: Array<{ id: string; title: string }> = data?.items || [];
          setPreviewQuestChips(items.map(i => ({ label: i.title, value: i.id })));
          if (previewSelectedQuests.length === 0) {
            setPreviewSelectedQuests(items.map(i => ({ label: i.title, value: i.id })));
          }
        })
        .catch(() => setPreviewQuestChips([]));
    } catch (e) {
      setPreviewQuestChips([]);
    }
  }, [taskDbQuery, previewSelectedTaskId, previewSelectedQuests.length]);

  const taskDbName = useMemo(() => {
    const t = taskDbDetail?.db?.title;
    return (t && t[0]?.plain_text) || selectedTaskDbId || "";
  }, [taskDbDetail, selectedTaskDbId]);
  const sessionDbName = useMemo(() => {
    const t = sessionDbDetail?.db?.title;
    return (t && t[0]?.plain_text) || selectedSessionDbId || "";
  }, [sessionDbDetail, selectedSessionDbId]);

  const taskTitlePropName = useMemo(() => {
    const props: any = taskDbDetail?.db?.properties || {};
    for (const [name, def] of Object.entries(props)) {
      if ((def as any)?.type === "title") return name;
    }
    return undefined;
  }, [taskDbDetail]);
  const taskItems = useMemo(() => {
    const results: any[] = (taskDbDetail as any)?.database?.results || [];
    const name = taskTitlePropName as string | undefined;
    const titles = results
      .map((r: any) => r?.properties?.[name || ""]?.title?.[0]?.plain_text)
      .filter(Boolean);
    return titles.slice(0, 5);
  }, [taskDbDetail, taskTitlePropName]);
  const taskRelationProps = useMemo(() => {
    const props: any = taskDbDetail?.db?.properties || {};
    return Object.entries(props)
      .filter(([, def]: any) => def?.type === "relation")
      .map(([n]) => n)
      .slice(0, 6);
  }, [taskDbDetail]);
  const availableTagsPreview = useMemo(() => {
    const props: Record<string, any> = taskDbDetail?.db?.properties || {};
    const tagsProp = props?.["Tags"]?.type === "multi_select"
      ? props["Tags"]
      : Object.values(props).find((p: any) => p?.type === "multi_select") as any;
    const options: any[] = tagsProp?.multi_select?.options || [];
    return options.map((o: any) => ({ label: o?.name || "", value: o?.id || o?.name || "", color: o?.color || "default" }));
  }, [taskDbDetail?.db?.properties]);
  const sessionTagProps = useMemo(() => {
    const props: any = sessionDbDetail?.db?.properties || {};
    return Object.entries(props)
      .filter(([, def]: any) => ["multi_select", "select"].includes(def?.type))
      .map(([n]) => n)
      .slice(0, 6);
  }, [sessionDbDetail]);

  const trackingStatusPropName = useMemo(() => {
    const props: any = sessionDbDetail?.db?.properties || {};
    if (props["Status"]?.type === "status" || props["Status"]?.type === "select") return "Status";
    const found = Object.entries(props).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0] as string | undefined;
    return found;
  }, [sessionDbDetail]);
  const trackingStartPropName = useMemo(() => {
    const props: any = sessionDbDetail?.db?.properties || {};
    if (props["Start Time"]?.type === "date") return "Start Time";
    if (props["Start Date"]?.type === "date") return "Start Date";
    const found = Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("start") || k.toLowerCase().includes("begin")) && p?.type === "date")?.[0] as string | undefined;
    return found;
  }, [sessionDbDetail]);
  const trackingEndPropName = useMemo(() => {
    const props: any = sessionDbDetail?.db?.properties || {};
    if (props["End Time"]?.type === "date") return "End Time";
    if (props["End Date"]?.type === "date") return "End Date";
    if (props["Due Date"]?.type === "date") return "Due Date";
    const found = Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("end") || k.toLowerCase().includes("finish") || k.toLowerCase().includes("due")) && p?.type === "date")?.[0] as string | undefined;
    return found;
  }, [sessionDbDetail]);
  const trackingDurationPropName = useMemo(() => {
    const props: any = sessionDbDetail?.db?.properties || {};
    if (props["Duration"]?.type) return "Duration";
    if (props["Duration (minutes)"]?.type) return "Duration (minutes)";
    if (props["Time Worked"]?.type) return "Time Worked";
    if (props["Time Tracking"]?.type) return "Time Tracking";
    if (props["Time Spent"]?.type) return "Time Spent";
    if (props["Elapsed"]?.type) return "Elapsed";
    if (props["Total Time"]?.type) return "Total Time";
    const found = Object.entries(props).find(([k, p]: any) => (
      (k.toLowerCase().includes("duration") || k.toLowerCase().includes("time") || k.toLowerCase().includes("elapsed"))
      && (p?.type === "number" || p?.type === "rich_text")
    ))?.[0] as string | undefined;
    return found;
  }, [sessionDbDetail]);

  const cardWidth = Math.max(380, (inputWidth || 0) + 64);

  const previewCardStyleStart: React.CSSProperties = {
    backgroundColor: widgetBg || (theme === "dark" ? "#111827" : "#ffffff"),
    color: widgetColor || (theme === "dark" ? "#f9fafb" : "#111827"),
    border: `1px solid ${inputBorder || (theme === "dark" ? "#374151" : "#d1d5db")}`,
    borderRadius: 12,
    padding: 16,
    paddingRight: 32,
    width: cardWidth,
    maxWidth: "100%",
    overflowX: "auto",
    boxSizing: "border-box",
  };

  const previewCardStyleTimer: React.CSSProperties = {
    backgroundColor: theme === "dark" ? "#111827" : (widgetBg || "#ffffff"),
    color: theme === "dark" ? "#f9fafb" : (widgetColor || "#111827"),
    border: `1px solid ${theme === "dark" ? "#374151" : (inputBorder || "#d1d5db")}`,
    borderRadius: 12,
    padding: 16,
    paddingRight: 32,
    width: cardWidth,
    maxWidth: "100%",
    overflowX: "auto",
    boxSizing: "border-box",
  };

  const timerStyle: React.CSSProperties = {
    color: timerColor,
    fontSize: timerFontSize,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  };

  const previewTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: theme === "dark" ? "#9ca3af" : "#6b7280",
    marginBottom: 4,
  };

  const inputStyle: React.CSSProperties = {
    width: inputWidth,
    border: `1px solid ${inputBorder || (theme === "dark" ? "#374151" : "#d1d5db")}`,
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
      const settings: any = {
        pageId: selectedPageId,
        theme,
        widgetBg,
        widgetColor,
        inputWidth,
        inputBorder,
        timerColor,
        timerFontSize,
        taskDatabaseId: selectedTaskDbId,
        sessionDatabaseId: selectedSessionDbId,
        hideDbSelectors: lockDbSelections,
      };
      // Task selection is handled within the embedded UI; omit taskId/taskTitle
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
    <div className="min-h-screen">
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
                className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 dark:text-white dark:border-neutral-700 dark:bg-neutral-800"
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

              {/* Data selections for embed */}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Data Selections</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Task Database</label>
                    <select className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 dark:text-white dark:border-neutral-700 dark:bg-neutral-800" value={selectedTaskDbId} onChange={(e) => setSelectedTaskDbId(e.target.value)}>
                      {dbs?.databases?.results?.map((d: any) => (
                        <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Session Database</label>
                    <select className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 dark:text-white dark:border-neutral-700 dark:bg-neutral-800" value={selectedSessionDbId} onChange={(e) => setSelectedSessionDbId(e.target.value)}>
                      {dbs?.databases?.results?.map((d: any) => (
                        <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2">
                      <input id="hideDbSelectors" type="checkbox" checked={lockDbSelections} onChange={(e) => setLockDbSelections(e.target.checked)} />
                      <span className="text-sm">Hide database selectors in embed</span>
                    </label>
                  </div>
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
                      const settings: any = {
                        pageId: selectedPageId,
                        theme,
                        widgetBg,
                        widgetColor,
                        inputWidth,
                        inputBorder,
                        timerColor,
                        timerFontSize,
                        taskDatabaseId: selectedTaskDbId,
                        sessionDatabaseId: selectedSessionDbId,
                        hideDbSelectors: lockDbSelections,
                      };
                      // Task selection happens in the embedded UI; do not include taskId/taskTitle in link
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
                  {isAuthenticated ? (
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
          <div className={`space-y-4 ${theme === "dark" ? "dark" : ""}`}>
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="mb-3 text-lg font-medium">Start State</h2>
              <div style={previewCardStyleStart}>
                
                <label className="block mb-1 text-sm">Session Title</label>
                <input style={inputStyle} placeholder="Widget Session" />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!lockDbSelections && (
                    <>
                      <div>
                        <label className="block mb-1 text-sm">Selected Table</label>
                        <div style={inputStyle as React.CSSProperties}>{taskDbName || "(not set)"}</div>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm">Time Tracking Database</label>
                        <div style={inputStyle as React.CSSProperties}>{sessionDbName || "(not set)"}</div>
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm">Task</label>
                    <select
                      style={inputStyle as React.CSSProperties}
                      value={previewSelectedTaskId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setPreviewSelectedTaskId(id);
                        const found = previewTaskItems.find((t) => t.id === id);
                        setPreviewSelectedTaskTitle(found?.title || "");
                        setPreviewSelectedQuests([]);
                      }}
                    >
                      {previewTaskItems.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm">Quests (relation)</label>
                    <QuestSelection
                      key={previewSelectedTaskId || "quest-select-preview"}
                      disabled={!previewSelectedTaskId}
                      projectId={previewSelectedTaskId || null}
                      values={previewSelectedQuests}
                      theme={theme}
                      relationName={previewQuestsRelProp}
                      width={inputWidth}
                      onChange={(opts: any[]) => {
                        const arr = (opts || []) as Array<{ label: string; value: string }>;
                        setPreviewSelectedQuests(arr);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm">Tags</label>
                    <NotionTags
                      options={availableTagsPreview}
                      disabled={!selectedTaskDbId}
                      selectedOptions={previewSelectedTags}
                      theme={theme}
                      width={inputWidth}
                      handleSelect={(vals: Array<{ label: string; value: string; color: string }>) => {
                        setPreviewSelectedTags(vals || []);
                      }}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm">Tracking Schema</label>
                    <div className="rounded-md border border-neutral-300 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
                      {trackingStatusPropName ? (
                        <span className="mr-2 inline-flex rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700 dark:text-white">Status: {trackingStatusPropName}</span>
                      ) : (
                        <span className="mr-2 opacity-60">Status: not found</span>
                      )}
                      {trackingDurationPropName ? (
                        <span className="mr-2 inline-flex rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700 dark:text-white">Duration: {trackingDurationPropName}</span>
                      ) : (
                        <span className="mr-2 opacity-60">Duration: not found</span>
                      )}
                      {trackingStartPropName && (
                        <span className="mr-2 inline-flex rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700 dark:text-white">Start: {trackingStartPropName}</span>
                      )}
                      {trackingEndPropName && (
                        <span className="mr-2 inline-flex rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700 dark:text-white">End: {trackingEndPropName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <label className="mt-3 block mb-1 text-sm">Notes</label>
                <textarea style={{ ...inputStyle, height: 64 }} rows={2} placeholder="Notes" />
                <div className="mt-3">
                  <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Start</button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="mb-3 text-lg font-medium">Timer Running</h2>
              <div style={previewCardStyleTimer}>
                <div style={previewTitleStyle}>Timer Running</div>
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
