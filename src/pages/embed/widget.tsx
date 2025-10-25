import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { trpc } from "../../utils/trpc";
import { savePomoSessionToNotion, startQuestWork, updateQuestStatus } from "../../utils/apis/notion/client";

type EmbedSettings = {
  pageId?: string;
  theme?: "light" | "dark" | "system";
  widgetBgColor?: string;
  widgetTextColor?: string;
  inputWidth?: number;
  inputBorderColor?: string;
  timerColor?: string;
  timerFontSize?: number;
};

function decodeConfigParam() {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const cParam = url.searchParams.get("c");
    if (!cParam) return null;
    const json = atob(cParam);
    return JSON.parse(json) as EmbedSettings;
  } catch (e) {
    console.warn("Failed to decode config", e);
    return null;
  }
}

export default function EmbedWidget() {
  const [config, setConfig] = useState<EmbedSettings | null>(null);
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

  // Timer state
  const [running, setRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const cfg = decodeConfigParam();
    setConfig(cfg);
  }, []);

  // Fetch databases via tRPC (same as home page style)
  const userIdentifier = "notion-user";
  const { data: dbData } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier },
    { refetchOnWindowFocus: false, retry: false }
  );

  useEffect(() => {
    if (dbData?.databases?.results && dbData.databases.results.length > 0) {
      const firstId = dbData.databases.results[0].id;
      setSelectedDbId((prev) => prev || firstId);
      // Try to pick a Time Tracking database by name; fallback to first
      const trackingCandidate = dbData.databases.results.find((d: any) => {
        const name = (d?.title && d?.title[0]?.plain_text) || "";
        return /time|tracking|timesheet|log/i.test(name);
      })?.id || firstId;
      setTrackingDbId((prev) => prev || trackingCandidate);
    }
  }, [dbData]);

  // Fetch tasks (pages) for selected database
  const { data: dbQueryData } = trpc.private.queryDatabase.useQuery(
    { email: userIdentifier, databaseId: selectedDbId },
    { enabled: !!selectedDbId, refetchOnWindowFocus: false, retry: false }
  );

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
      setLinkedQuestIds(ids);
    } catch (e) {
      console.warn("Failed to derive linked quest IDs", e);
      setLinkedQuestIds([]);
    }
  }, [dbQueryData, selectedTaskId]);

  const previewCardStyle: React.CSSProperties = useMemo(() => ({
    backgroundColor: config?.widgetBgColor || (config?.theme === "dark" ? "#111827" : "#ffffff"),
    color: config?.widgetTextColor || (config?.theme === "dark" ? "#f9fafb" : "#111827"),
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  }), [config]);

  const inputStyle: React.CSSProperties = useMemo(() => ({
    width: config?.inputWidth ? `${config.inputWidth}%` : "100%",
    border: `1px solid ${config?.inputBorderColor || (config?.theme === "dark" ? "#374151" : "#d1d5db")}`,
    padding: "8px 10px",
    borderRadius: 8,
    backgroundColor: config?.theme === "dark" ? "#111827" : "#ffffff",
    color: config?.widgetTextColor || (config?.theme === "dark" ? "#f9fafb" : "#111827"),
    outline: "none",
  }), [config]);

  const timerStyle: React.CSSProperties = useMemo(() => ({
    color: config?.timerColor || (config?.theme === "dark" ? "#93c5fd" : "#2563eb"),
    fontSize: config?.timerFontSize || 48,
    fontWeight: 700,
    letterSpacing: 1,
  }), [config]);

  const containerClasses = useMemo(() => {
    const theme = config?.theme || "system";
    if (theme === "dark") return "bg-neutral-900 text-white";
    if (theme === "light") return "bg-white text-neutral-900";
    return "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white";
  }, [config]);

  return (
    <div className={`min-h-screen ${containerClasses}`}> 
      <Head>
        <title>Pomodoro Embed Widget</title>
      </Head>
      <div className="mx-auto max-w-xl px-4 py-6">
        {!config && (
          <div className="rounded-lg border border-neutral-200 p-4 text-sm opacity-75 dark:border-neutral-800">
            No config provided. Pass base64 config via query param `c`.
          </div>
        )}
        {config && (
          <div>
            {/* Controls */}
            <div className="mb-4 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <div className="mb-2">Notion Page: <span className="opacity-70">{config.pageId || "(not set)"}</span></div>
              <label className="block mb-1">Session Title</label>
              <input className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block mb-1">Selected Table</label>
                  <select className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800" value={selectedDbId} onChange={(e) => setSelectedDbId(e.target.value)}>
                    {dbData?.databases?.results?.map((d: any) => (
                      <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Time Tracking Database</label>
                  <select className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800" value={trackingDbId} onChange={(e) => setTrackingDbId(e.target.value)}>
                    {dbData?.databases?.results?.map((d: any) => (
                      <option key={d.id} value={d.id}>{(d?.title && d?.title[0]?.plain_text) || d.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Task</label>
                  <select
                    className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800"
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
                <div>
                  <label className="block mb-1">Tags (comma separated)</label>
                  <input className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g., Focus, Coding" />
                </div>
              </div>
              <label className="mt-3 block mb-1">Notes</label>
              <textarea className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* Widget */}
            <div style={previewCardStyle}>
              {/* Start/Running State */}
              {!running && (
                <>
                  <input style={inputStyle} placeholder="Task / Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      onClick={async () => {
                        // Update task status to In Progress when starting
                        const userId = "notion-user";
                        const targets = linkedQuestIds.length > 0 ? linkedQuestIds : [];
                        if (targets.length === 0) {
                          console.warn("No linked quests found on selected tracker entry.");
                        }
                        for (const qid of targets) {
                          try {
                            await startQuestWork({
                              userId,
                              questPageId: qid,
                              projectTitle: selectedTaskTitle || title || "Task",
                              adventurePageId: config?.pageId,
                            });
                            await updateQuestStatus({
                              userId,
                              questPageId: qid,
                              status: "In Progress",
                              targetDatabaseId: selectedDbId,
                              adventurePageId: config?.pageId,
                            });
                          } catch (err) {
                            console.error("Failed to start quest", err);
                            setErrorMsg("Failed to update task status on start.");
                          }
                        }
                        setRunning(true);
                        const now = Date.now();
                        setStartTime(now);
                        setElapsedMs(0);
                        if (intervalRef.current) window.clearInterval(intervalRef.current);
                        intervalRef.current = window.setInterval(() => {
                          setElapsedMs((prev) => prev + 1000);
                        }, 1000);
                      }}
                    >
                      Start
                    </button>
                    <span className="text-xs opacity-70">Tracking time…</span>
                  </div>
                </>
              )}
              {running && (
                <>
                  <div style={timerStyle}>{new Date(elapsedMs).toISOString().substr(14, 5)}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-300"
                      onClick={() => {
                        setRunning(false);
                        if (intervalRef.current) window.clearInterval(intervalRef.current);
                        const userId = "notion-user";
                        const targets = linkedQuestIds.length > 0 ? linkedQuestIds : [];
                        targets.forEach((qid) => {
                          updateQuestStatus({
                            userId,
                            questPageId: qid,
                            status: "Paused",
                            targetDatabaseId: selectedDbId,
                            adventurePageId: config?.pageId,
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
                          const userId = "notion-user";
                          const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
                          // Save to Time Tracking database with exact fields
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
                            databaseId: selectedDbId,
                            targetDatabaseId: trackingDbId,
                            timerValue: timerSeconds,
                            startTime: startSeconds,
                            endTime: endSeconds,
                            status: "Completed",
                            notes,
                            tags,
                          });
                          // Update task status to Completed in selected table
                          const targets = linkedQuestIds.length > 0 ? linkedQuestIds : [];
                          for (const qid of targets) {
                            await updateQuestStatus({
                              userId,
                              questPageId: qid,
                              status: "Completed",
                              targetDatabaseId: selectedDbId,
                              adventurePageId: config?.pageId,
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
                </>
              )}
            </div>

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