import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { trpc } from "../../utils/trpc";
import { NotionCache } from "../../utils/notionCache";
import QuestSelection from "../../Components/QuestSelection";
import NotionTags from "../../Components/NotionTags";
import { savePomoSessionToNotion, startQuestWork, updateQuestStatus, updateTaskStatus } from "../../utils/apis/notion/client";

type EmbedSettings = {
  pageId?: string;
  theme?: "light" | "dark" | "system";
  widgetBgColor?: string;
  widgetTextColor?: string;
  inputWidth?: number;
  inputBorderColor?: string;
  timerColor?: string;
  timerFontSize?: number;
  taskDatabaseId?: string;
  sessionDatabaseId?: string;
  taskId?: string;
  taskTitle?: string;
  // Back-compat: hideSelectors from earlier version; new flag hides only DB selectors
  hideSelectors?: boolean;
  hideDbSelectors?: boolean;
  userId?: string;
};

function decodeConfigParam() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    let raw = url.searchParams.get("c") || url.searchParams.get("config") || null;
    if (!raw && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      raw = params.get("c") || params.get("config");
    }
    if (!raw) return null;
    let base = raw;
    try { base = decodeURIComponent(base); } catch {}
    try {
      const json = atob(base);
      return JSON.parse(json) as EmbedSettings;
    } catch {
      const normalized = (() => {
        let s = base.replace(/-/g, "+").replace(/_/g, "/");
        const pad = s.length % 4;
        if (pad === 2) s += "=="; else if (pad === 3) s += "=";
        return s;
      })();
      const json = atob(normalized);
      return JSON.parse(json) as EmbedSettings;
    }
  } catch {
    return null;
  }
}

function getUrlUserOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const u = url.searchParams.get("u") || url.searchParams.get("userId");
    return u ? String(u) : null;
  } catch {
    return null;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(";").shift()!);
  return null;
}

export default function EmbedWidget() {
  const [config, setConfig] = useState<EmbedSettings | null>(null);
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [selectedDbId, setSelectedDbId] = useState<string>("");
  const [trackingDbId, setTrackingDbId] = useState<string>("");
  const [title, setTitle] = useState<string>("Widget Session");
  const [notes, setNotes] = useState<string>("");
  const [tagsStr, setTagsStr] = useState<string>("");
  const [savingMsg, setSavingMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>("");
  const [linkedQuestIds, setLinkedQuestIds] = useState<string[]>([]);
  const [selectedQuests, setSelectedQuests] = useState<Array<{ label: string; value: string }>>([]);
  const [questOptions, setQuestOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<Array<{ label: string; value: string; color: string }>>([]);

  // Timer state
  const [running, setRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const cfg = decodeConfigParam();
    setConfig(cfg);
    if (cfg?.taskDatabaseId) {
      setSelectedDbId((prev) => prev || cfg.taskDatabaseId);
    }
    if (cfg?.sessionDatabaseId) {
      setTrackingDbId((prev) => prev || cfg.sessionDatabaseId);
    }
    if (cfg?.taskId) {
      setSelectedTaskId((prev) => prev || cfg.taskId);
    }
    if (cfg?.taskTitle) {
      setSelectedTaskTitle((prev) => prev || cfg.taskTitle);
    }
    if (cfg?.userId) {
       setUserIdentifier((prev) => prev || String(cfg.userId));
    }
    try {
      const url = new URL(window.location.href);
      const overrideUser = url.searchParams.get("u") || url.searchParams.get("userId");
      if (overrideUser) {
        setUserIdentifier(String(overrideUser));
      }
    } catch {}
  }, []);

  // Detect system dark preference for 'system' theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsSystemDark(!!mq?.matches);
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);

  // Determine which identifier to use for Notion access
  // Prefer logged-in session email; fallback to "notion-user"
  const [userIdentifier, setUserIdentifier] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const urlUser = getUrlUserOverride();
    if (urlUser) return urlUser;
    const cached = NotionCache.getUserData()?.email;
    return cached || '';
  });
  const [accessToken, setAccessToken] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const cached = NotionCache.getUserData();
    return cached?.accessToken || undefined;
  });

  useEffect(() => {
    try {
      const cached = NotionCache.getUserData();
      if (cached?.accessToken) {
        setAccessToken(cached.accessToken);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(data => {
        if (data?.isAuthenticated && data?.email) {
          setUserIdentifier(String(data.email));
        }
      })
      .catch(() => undefined);
  }, []);

  // Fetch databases via tRPC (same as home page style)
  const { data: dbData, error: dbError } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier, accessToken },
    { refetchOnWindowFocus: false, retry: false, enabled: !!userIdentifier && (!!accessToken || !!userIdentifier) }
  );

  useEffect(() => {
    if (dbData?.databases?.results && dbData.databases.results.length > 0) {
      const firstId = dbData.databases.results[0].id;
      setSelectedDbId((prev) => prev || config?.taskDatabaseId || firstId);
      // Try to pick a Time Tracking database by name; fallback to first
      const trackingCandidate = dbData.databases.results.find((d: any) => {
        const name = (d?.title && d?.title[0]?.plain_text) || "";
        return /time|tracking|timesheet|log/i.test(name);
      })?.id || firstId;
      setTrackingDbId((prev) => prev || config?.sessionDatabaseId || trackingCandidate);
    }
  }, [dbData, config?.taskDatabaseId, config?.sessionDatabaseId]);

  // Fetch tasks (pages) for selected database
  const { data: dbQueryData, error: queryError } = trpc.private.queryDatabase.useQuery(
    { email: userIdentifier, databaseId: selectedDbId, accessToken },
    { enabled: !!selectedDbId && (!!accessToken || !!userIdentifier), refetchOnWindowFocus: false, retry: false }
  );

  // Fetch database detail to get schema (e.g., Tags options)
  const { data: dbDetailData, error: detailError } = trpc.private.getDatabaseDetail.useQuery(
    { email: userIdentifier, databaseId: selectedDbId, accessToken },
    { enabled: !!selectedDbId && (!!accessToken || !!userIdentifier), refetchOnWindowFocus: false, retry: false }
  );

  // Handle API token errors
  useEffect(() => {
    const error = dbError || queryError || detailError;
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("token") || msg.includes("unauthorized") || msg.includes("auth") || msg.includes("invalid")) {
        console.log("Invalid token detected in widget, clearing cache");
        NotionCache.clearUserData();
        setAccessToken(undefined);
        setErrorMsg("Notion connection expired. Please reconnect.");
      }
    }
  }, [dbError, queryError, detailError]);

  const taskItems = useMemo(() => {
    const results: any[] = dbQueryData?.database?.results || [];
    const items = results.map((r: any) => {
      const props: Record<string, any> = r?.properties || {};
      const titlePropName = Object.entries(props).find(([, p]: any) => p?.type === "title")?.[0] || "Name";
      const titleParts = props?.[titlePropName]?.title || [];
      const title = Array.isArray(titleParts)
        ? titleParts.map((t: any) => t?.plain_text || t?.text?.content || "").join("").trim()
        : "Untitled";
      return { id: r?.id as string, title: title || "Untitled" };
    });
    return items as Array<{ id: string; title: string }>;
  }, [dbQueryData]);

  useEffect(() => {
    if (taskItems.length > 0) {
      setSelectedTaskId((prev) => prev || taskItems[0].id);
      setSelectedTaskTitle((prev) => prev || taskItems[0].title);
    } else {
      setSelectedTaskId("");
      setSelectedTaskTitle("");
    }
  }, [taskItems]);

  // Derive linked quest IDs from the selected tracker entry via its relation property (Quest/Quests)
  useEffect(() => {
    try {
      const results: any[] = dbQueryData?.database?.results || [];
      const page = results.find((r: any) => r?.id === selectedTaskId);
      const props: Record<string, any> = page?.properties || {};
      const questsRelProp = props?.["Quests"]?.type === "relation"
        ? "Quests"
        : props?.["Quest"]?.type === "relation"
          ? "Quest"
          : Object.entries(props).find(([k, p]: any) => k?.toLowerCase?.().includes("quest") && p?.type === "relation")?.[0];
      const relations: any[] = questsRelProp ? (props[questsRelProp] as any)?.relation || [] : [];
      const ids = relations.map((r) => r?.id).filter(Boolean);
      // Only auto-derive if user hasn't selected explicitly
      if (!selectedQuests || selectedQuests.length === 0) {
        setLinkedQuestIds(ids);
      }
    } catch (e) {
      console.warn("Failed to derive linked quest IDs", e);
      setLinkedQuestIds([]);
    }
  }, [dbQueryData, selectedTaskId, selectedQuests]);

  // Auto-populate selected quests options with current relations when task changes (fetch titles)
  useEffect(() => {
    const populateQuests = async () => {
      if (!selectedTaskId) return;
      if (!userIdentifier) return;
      if (selectedQuests && selectedQuests.length > 0) return;
      try {
        const qs = new URLSearchParams({ userId: userIdentifier, pageId: selectedTaskId, relationName: "Quests" });
        const resp = await fetch(`/api/notion/page-relations?${qs.toString()}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const items: Array<{ id: string; title: string }> = data?.items || [];
        const values = items.map(i => ({ label: i.title, value: i.id }));
        setSelectedQuests(values);
        setLinkedQuestIds(values.map(v => v.value));
        setQuestOptions(values);
      } catch (e) {
      }
    };
    populateQuests();
  }, [selectedTaskId, userIdentifier]);

  // Derive available tag options from database schema (prefer Tags multi_select)
  const availableTags = useMemo(() => {
    const props: Record<string, any> = dbDetailData?.db?.properties || {};
    const tagsProp = props?.["Tags"]?.type === "multi_select"
      ? props["Tags"]
      : Object.values(props).find((p: any) => p?.type === "multi_select") as any;
    const options: any[] = tagsProp?.multi_select?.options || [];
    return options.map((o: any) => ({ label: o?.name || "", value: o?.id || o?.name || "", color: o?.color || "default" }));
  }, [dbDetailData?.db?.properties]);

  // Prefill selected tags from the chosen task page's properties
  useEffect(() => {
    try {
      const results: any[] = dbQueryData?.database?.results || [];
      const page = results.find((r: any) => r?.id === selectedTaskId);
      const props: Record<string, any> = page?.properties || {};
      const tagPropName = props?.["Tags"]?.type === "multi_select"
        ? "Tags"
        : Object.entries(props).find(([, p]: any) => p?.type === "multi_select")?.[0];
      const selected = tagPropName ? (props?.[tagPropName] as any)?.multi_select || [] : [];
      const values = selected.map((m: any) => ({ label: m?.name || "", value: m?.id || m?.name || "", color: m?.color || "default" }));
      setSelectedTags(values);
    } catch (e) {
      setSelectedTags([]);
    }
  }, [dbQueryData, selectedTaskId]);

  const previewCardStyle: React.CSSProperties = useMemo(() => ({
    backgroundColor: (config?.widgetBgColor ?? config?.widgetBg) || (config?.theme === "dark" ? "#111827" : "#ffffff"),
    color: (config?.widgetTextColor ?? config?.widgetColor) || (config?.theme === "dark" ? "#f9fafb" : "#111827"),
    border: `1px solid ${config?.theme === "dark" ? "#374151" : ((config?.inputBorderColor ?? config?.inputBorder) || "#d1d5db")}`,
    borderRadius: 12,
    padding: 16,
    paddingRight: 32,
    width: Math.max(380, ((config?.inputWidth ?? 0) as number) + 64),
    maxWidth: "100%",
    overflowX: "auto",
    boxSizing: "border-box",
  }), [config]);

  const inputStyle: React.CSSProperties = useMemo(() => ({
    width: (config?.inputWidth ?? 0) > 0 ? (config!.inputWidth as number) : "100%",
    border: `1px solid ${((config?.inputBorderColor ?? config?.inputBorder) || (config?.theme === "dark" ? "#374151" : "#d1d5db"))}`,
    padding: "8px 10px",
    borderRadius: 8,
    backgroundColor: config?.theme === "dark" ? "#111827" : "#ffffff",
    color: (config?.widgetTextColor ?? config?.widgetColor) || (config?.theme === "dark" ? "#f9fafb" : "#111827"),
    outline: "none",
  }), [config]);

  const timerStyle: React.CSSProperties = useMemo(() => ({
    color: config?.timerColor || (config?.theme === "dark" ? "#93c5fd" : "#2563eb"),
    fontSize: config?.timerFontSize || 48,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  }), [config]);

  const previewTitleStyle: React.CSSProperties = useMemo(() => ({
    fontSize: 12,
    fontWeight: 500,
    color: config?.theme === "dark" ? "#9ca3af" : "#6b7280",
    marginBottom: 4,
  }), [config]);

  const secondaryButtonStyle: React.CSSProperties = useMemo(() => ({
    backgroundColor: config?.theme === "dark" ? "#374151" : "#e5e7eb",
    color: config?.theme === "dark" ? "#f9fafb" : "#111827",
    border: `1px solid ${config?.theme === "dark" ? "#4b5563" : "#d1d5db"}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 500,
  }), [config]);

  const containerClasses = useMemo(() => {
    const theme = config?.theme || "system";
    if (theme === "dark") return "bg-neutral-900 text-white";
    if (theme === "light") return "bg-white text-neutral-900";
    return "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white";
  }, [config]);

  const effectiveTheme = useMemo(() => {
    const t = config?.theme || "system";
    if (t === "dark") return "dark";
    if (t === "system") return isSystemDark ? "dark" : "light";
    return "light";
  }, [config?.theme, isSystemDark]);

  const cardWidth = useMemo(() => Math.max(380, ((config?.inputWidth ?? 0) as number) + 64), [config?.inputWidth]);

  return (
    <div className={`min-h-screen ${containerClasses} ${(config?.theme === 'dark' || (config?.theme === 'system' && isSystemDark)) ? 'dark' : ''}`}> 
      <Head>
        <title>Pomodoro Embed Widget</title>
      </Head>
      <div className="mx-auto px-4 py-6" style={{ maxWidth: cardWidth }}>
        {!config && (
          <div className="rounded-lg border border-neutral-200 p-4 text-sm opacity-75 dark:border-neutral-800">
            No config provided. Pass base64 config via query param `c`.
          </div>
        )}
        {config && (
          <div>
            {/* Controls / Timer Card */}
            {!running ? (
              <div style={{ ...previewCardStyle, marginBottom: 16 }}>
                
                <label className="block mb-1">Session Title</label>
                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!(config?.hideDbSelectors ?? config?.hideSelectors) && (
                    <>
                      <div>
                        <label className="block mb-1">Selected Table</label>
                        <select className="w-full rounded-md border border-neutral-300 p-2 text-neutral-900 dark:text-white dark:border-neutral-700 dark:bg-neutral-800" value={selectedDbId} onChange={(e) => setSelectedDbId(e.target.value)}>
                          {dbData?.databases?.results?.map((d: any) => (
                            <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1">Time Tracking Database</label>
                        <select className="w-full rounded-md border border-neutral-300 p-2 text-neutral-900 dark:text-white dark:border-neutral-700 dark:bg-neutral-800" value={trackingDbId} onChange={(e) => setTrackingDbId(e.target.value)}>
                          {dbData?.databases?.results?.map((d: any) => (
                            <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block mb-1">Task</label>
                    <select
                      style={inputStyle as React.CSSProperties}
                      value={selectedTaskId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedTaskId(id);
                        const found = taskItems.find((t) => t.id === id);
                        setSelectedTaskTitle(found?.title || "");
                      }}
                    >
                      {taskItems.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1">Quests (relation)</label>
      <QuestSelection
                      disabled={!selectedTaskId}
                      projectId={selectedTaskId || null}
                      values={selectedQuests}
                      theme={effectiveTheme as any}
                      width={(config?.inputWidth ?? 0) > 0 ? (config!.inputWidth as number) : undefined}
                      overrideOptions={questOptions}
                      accessToken={accessToken}
                      onChange={(opts: any[]) => {
          const arr = (opts || []) as Array<{ label: string; value: string }>;
          setSelectedQuests(arr);
          setLinkedQuestIds(arr.map((o) => o.value));
        }}
      />
                  </div>
                  <div>
                    <label className="block mb-1">Tags</label>
                    <NotionTags
                      options={availableTags}
                      disabled={!selectedDbId}
                      selectedOptions={selectedTags}
                      theme={effectiveTheme as any}
                      width={(config?.inputWidth ?? 0) > 0 ? (config!.inputWidth as number) : undefined}
                      handleSelect={(vals: Array<{ label: string; value: string; color: string }>) => {
                        setSelectedTags(vals || []);
                      }}
                    />
                  </div>
                </div>
                <label className="mt-3 block mb-1">Notes</label>
                <textarea style={{ ...inputStyle, height: 64 }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    onClick={() => {
                      setSavingMsg("");
                      setErrorMsg("");
                      const now = Date.now();
                      setRunning(true);
                      setStartTime(now);
                      setElapsedMs(0);
                      if (intervalRef.current) window.clearInterval(intervalRef.current);
                      intervalRef.current = window.setInterval(() => {
                        setElapsedMs((prev) => prev + 1000);
                      }, 1000);
                      const userId = userIdentifier;
                      const taskPageId = selectedTaskId || config?.taskId || config?.pageId;
                      const targets = (selectedQuests?.map(q => q.value) || []).length > 0
                        ? selectedQuests.map(q => q.value)
                        : (linkedQuestIds.length > 0 ? linkedQuestIds : []);
                      const ops: Promise<any>[] = [];
                      if (taskPageId) {
                        ops.push(updateTaskStatus({ userId, pageId: taskPageId, status: "In Progress" }));
                      }
                      targets.forEach((qid) => {
                        ops.push(startQuestWork({
                          userId,
                          questPageId: qid,
                          projectTitle: selectedTaskTitle || title || "Task",
                          adventurePageId: config?.pageId,
                          accessToken,
                        }));
                        ops.push(updateQuestStatus({
                          userId,
                          questPageId: qid,
                          status: "In Progress",
                          targetDatabaseId: selectedDbId,
                          adventurePageId: config?.pageId,
                          accessToken,
                        }));
                      });
                      void Promise.all(ops).catch(() => {
                        setErrorMsg("Failed to update task status on start.");
                      });
                    }}
                  >
                    Start
                  </button>
                </div>
              </div>
            ) : (
              <div style={previewCardStyle}>
                <div style={previewTitleStyle}>Timer Running</div>
                <div style={timerStyle}>{new Date(elapsedMs).toISOString().substr(14, 5)}</div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    style={secondaryButtonStyle}
                    onClick={() => {
                      setRunning(false);
                      if (intervalRef.current) window.clearInterval(intervalRef.current);
                      const userId = userIdentifier;
                      const taskPageId = selectedTaskId || config?.taskId || config?.pageId;
                      if (taskPageId) {
                        updateTaskStatus({ userId, pageId: taskPageId, status: "Paused", accessToken }).catch((e) => {
                          console.warn("Failed to set task status Paused", e);
                        });
                      }
                      const targets = linkedQuestIds.length > 0 ? linkedQuestIds : [];
                      targets.forEach((qid) => {
                        updateQuestStatus({
                          userId,
                          questPageId: qid,
                          status: "Paused",
                          targetDatabaseId: selectedDbId,
                          adventurePageId: config?.pageId,
                          accessToken,
                        }).catch((err) => {
                          console.error("Failed to pause quest", err);
                          setErrorMsg("Failed to update task status on pause.");
                        });
                      });
                    }}
                  >
                    Pause
                  </button>
                  <button
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    onClick={async () => {
                      try {
                        setSavingMsg("");
                        setErrorMsg("");
                        setRunning(false);
                        if (intervalRef.current) window.clearInterval(intervalRef.current);
                        const endTimeMs = Date.now();
                        const userId = userIdentifier;
                        const tags = (selectedTags || []).map(t => t.label).filter(Boolean);
                        if (!trackingDbId) {
                          setErrorMsg("Please select a Time Tracking database.");
                          return;
                        }
                        const timerSeconds = Math.max(60, Math.floor(elapsedMs / 1000));
                        const startSeconds = Math.floor((startTime ?? endTimeMs) / 1000);
                        const endSeconds = Math.floor(endTimeMs / 1000);
                        await savePomoSessionToNotion({
                          userId,
                          projectId: selectedTaskId || config?.pageId || "widget",
                          projectTitle: selectedTaskTitle || title || "Widget Session",
                          sessionTitle: title || "",
                          databaseId: selectedDbId,
                          targetDatabaseId: trackingDbId,
                          timerValue: timerSeconds,
                          startTime: startSeconds,
                          endTime: endSeconds,
                          status: "Completed",
                          notes,
                          tags,
                          questPageIds: (selectedQuests || []).map(q => q.value),
                          accessToken,
                        });
                        const taskPageId = selectedTaskId || config?.taskId || config?.pageId;
                        if (taskPageId) {
                          try {
                            await updateTaskStatus({ userId, pageId: taskPageId, status: "Completed", accessToken });
                          } catch (e) {
                            console.warn("Failed to set task status Completed", e);
                          }
                        }
                        const targets = (selectedQuests?.map(q => q.value) || []).length > 0
                          ? selectedQuests.map(q => q.value)
                          : (linkedQuestIds.length > 0 ? linkedQuestIds : []);
                        for (const qid of targets) {
                          await updateQuestStatus({
                            userId,
                            questPageId: qid,
                            status: "Completed",
                            targetDatabaseId: selectedDbId,
                            adventurePageId: config?.pageId,
                            accessToken,
                          });
                        }
                        setSavingMsg("Time Tracking entry saved and status updated.");
                        setElapsedMs(0);
                        setStartTime(null);
                      } catch (err) {
                        console.error("Widget completion error", err);
                        setErrorMsg("Failed to save tracking entry or update status.");
                      }
                    }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            )}

            {/* Removed duplicate Widget card; Start button is now in the config card above */}

            {(savingMsg || errorMsg) && (
              <div className="mt-3 text-sm">
                {savingMsg && <span className="text-green-600">{savingMsg}</span>}
                {errorMsg && <span className="text-red-600">{errorMsg}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
