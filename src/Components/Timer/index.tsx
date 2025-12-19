import { actionTypes } from "@/utils/Context/PomoContext/reducer";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import Head from "next/head";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { toast } from "react-toastify";
import OutsideClickHandler from "react-outside-click-handler";
import useSyncPomo from "../../hooks/useSyncPomo";
import useWindowActive from "../../hooks/useWindowActive";
import { usePomoState } from "../../utils/Context/PomoContext/Context";
import Break from "../Break";
import Controls from "../Controls";
import SoundLevel from "../Noises/NoiseCard/SoundLevel";
import Session from "../Session";
import Switch from "../Switch";
import WakeLockNote from "./WakeLockNote";
import dynamic from "next/dynamic";
const PomoSessionConfigComp = dynamic(() => import("../PomoSessionConfig"), { loading: () => <div>Loading...</div>, ssr: false });
import { usePomoSessionConfig } from "../../hooks/usePomoSessionConfig";
import { startQuestWork, updateQuestStatus, updateTaskStatus } from "../../utils/apis/notion/client";
import { NotionCache } from "../../utils/notionCache";

type Props = {
  projectName: string;
  projects?: Array<{ label: string; value: string }>;
  availableTags?: Array<{ label: string; value: string; color: string }>;
  selectedTags?: Array<{ label: string; value: string; color: string }>;
  selectedQuests?: Array<{ label: string; value: string }>;
  currentDatabaseId?: string;
  availableDatabases?: Array<{ id: string; title: string; icon?: string }>;
};

export default function Timer({ 
  projectName,
  projects = [],
  availableTags = [],
  selectedTags = [],
  selectedQuests = [],
  currentDatabaseId,
  availableDatabases = []
}: Props) {
  const timerScreen = useFullScreenHandle();

  const [{ timerLabel, project, shouldTickSound, busyIndicator, startTime, tickVolume, sessionValue, timerValue }, dispatch] = usePomoState();



  const isWindowActive = useWindowActive();

  const [disableControls, setDisableControls] = useState(false);

  const [showPopover, setPopover] = useState(false);
  const [showNote, setNote] = useState<
    null | "success" | "error" | "warning"
  >();

  const [completedSummary] = useState<{ count: number; items: Array<{ id: string; title: string }> } | null>(null);
  const [loadingCompleted] = useState(false);

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
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
    let mounted = true;
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.isAuthenticated) setSessionEmail(data?.email || null);
        else setSessionEmail(null);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/user/identifier')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setResolvedUserId(d?.resolvedUserId || null);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const userIdentifier = (resolvedUserId && resolvedUserId !== 'notion-user')
    ? resolvedUserId
    : (sessionEmail || (typeof window !== 'undefined' ? (localStorage.getItem('notion_user_data') ? JSON.parse(localStorage.getItem('notion_user_data') as string)?.email : null) : null) || "");

  const effectiveUserId = (sessionEmail && sessionEmail !== 'notion-user')
    ? sessionEmail
    : ((resolvedUserId && resolvedUserId !== 'notion-user') ? resolvedUserId : (userIdentifier && userIdentifier !== 'notion-user' ? userIdentifier : ""));

  // Initialize session configuration hook
  const sessionConfig = usePomoSessionConfig({
    projects,
    availableTags,
    selectedTags,
    selectedQuests,
    currentDatabaseId,
    availableDatabases,
    userId: effectiveUserId,
  });

  const refreshCompleted = useCallback(async () => {
    return;
  }, []);

  // When the timer transitions from stopped to started, create a live entry with proper Quest relation
  const prevBusy = useRef(false);
  const lastStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    const justStarted = busyIndicator && !prevBusy.current;
    if (justStarted) {
      if (!effectiveUserId) {
        prevBusy.current = busyIndicator;
        return;
      }
      const adventurePageId = sessionConfig.config.selectedProject?.value;
      const taskPageId = sessionConfig.config.selectedProject?.value || null;
      const targetDatabaseId = sessionConfig.config.selectedDatabase?.value || currentDatabaseId;

      // If resuming the same session, only update status back to In Progress
      if (lastStartTimeRef.current === startTime) {
        if (taskPageId) {
          updateTaskStatus({ userId: effectiveUserId, pageId: taskPageId, status: "In Progress" }).catch(() => undefined);
        }
        const selectedIds = (selectedQuests || []).map(q => q.value);
        const applyStart = (ids: string[]) => {
          ids.forEach((qid) => {
            updateQuestStatus({ userId: effectiveUserId, status: "In Progress", questPageId: qid, adventurePageId, targetDatabaseId }).catch(() => undefined);
          });
        };
        if (selectedIds.length > 0) {
          applyStart(selectedIds);
        } else if (taskPageId && userIdentifier) {
          const qs = new URLSearchParams({ userId: effectiveUserId, pageId: taskPageId, relationName: "Quests" });
          fetch(`/api/notion/page-relations?${qs.toString()}`)
            .then(r => r.json())
            .then(json => {
              const ids = ((json?.items || []) as Array<{ id: string }>).map(i => i.id);
              if (ids.length > 0) applyStart(ids);
            })
            .catch(() => undefined);
        }
        prevBusy.current = busyIndicator;
        return;
      }

      if (taskPageId) {
        updateTaskStatus({ userId: effectiveUserId, pageId: taskPageId, status: "In Progress" }).catch(() => undefined);
      }
      const selectedIds = (selectedQuests || []).map(q => q.value);
      const applyStart = (ids: string[]) => {
        ids.forEach((qid) => {
          updateQuestStatus({ userId: effectiveUserId, status: "In Progress", questPageId: qid, adventurePageId, targetDatabaseId }).catch(() => undefined);
        });
      };
      if (selectedIds.length > 0) {
        applyStart(selectedIds);
      } else if (taskPageId && userIdentifier) {
        const qs = new URLSearchParams({ userId: effectiveUserId, pageId: taskPageId, relationName: "Quests" });
        fetch(`/api/notion/page-relations?${qs.toString()}`)
          .then(r => r.json())
          .then(json => {
            const ids = ((json?.items || []) as Array<{ id: string }>).map(i => i.id);
            if (ids.length > 0) applyStart(ids);
          })
          .catch(() => undefined);
      }
      lastStartTimeRef.current = startTime;
    }
    prevBusy.current = busyIndicator;
  }, [busyIndicator, startTime, sessionConfig.config.selectedProject?.value, sessionConfig.config.selectedProject?.label, projectName, project?.value, selectedQuests, sessionConfig.config.selectedTrackingDatabase?.value]);

  // Pause: update statuses to Paused for task and related quests
  useEffect(() => {
    const justPaused = !busyIndicator && prevBusy.current;
    if (justPaused) {
      if (!effectiveUserId) {
        prevBusy.current = busyIndicator;
        return;
      }
      const adventurePageId = sessionConfig.config.selectedProject?.value;
      const taskPageId = sessionConfig.config.selectedProject?.value || null;
      const targetDatabaseId = sessionConfig.config.selectedDatabase?.value || currentDatabaseId;
      if (taskPageId) {
        updateTaskStatus({ userId: effectiveUserId, pageId: taskPageId, status: "Paused", accessToken }).catch(() => undefined);
      }
      const selectedIds = (selectedQuests || []).map(q => q.value);
      const applyPause = (ids: string[]) => {
        ids.forEach((qid) => {
          updateQuestStatus({ userId: effectiveUserId, questPageId: qid, status: "Paused", adventurePageId, targetDatabaseId, accessToken }).catch(() => undefined);
        });
      };
      if (selectedIds.length > 0) {
        applyPause(selectedIds);
      } else if (taskPageId && userIdentifier) {
        const params: any = { userId: effectiveUserId, pageId: taskPageId, relationName: "Quests" };
        if (accessToken) params.accessToken = accessToken;
        const qs = new URLSearchParams(params);
        fetch(`/api/notion/page-relations?${qs.toString()}`)
          .then(r => r.json())
          .then(json => {
            const ids = ((json?.items || []) as Array<{ id: string }>).map(i => i.id);
            if (ids.length > 0) applyPause(ids);
          })
          .catch(() => undefined);
      }
    }
    prevBusy.current = busyIndicator;
  }, [busyIndicator, selectedQuests, sessionConfig.config.selectedProject?.value, project?.value, sessionConfig.config.selectedTrackingDatabase?.value]);

  // Handle session completion and save to Notion if configured
  const handleSessionComplete = useCallback(async (sessionData: {
    timerValue: number;
    startTime: number;
    endTime: number;
    sessionType: "work" | "break";
  }) => {
    if (sessionConfig.isReadyToSave) {
      try {
        await sessionConfig.saveSessionToNotion(sessionData);
        toast.success("Session saved to Notion database!", {
          autoClose: 3000,
        });
        // Update statuses to Completed for task and related quests
        const adventurePageId = sessionConfig.config.selectedProject?.value;
        const taskPageId = sessionConfig.config.selectedProject?.value || null;
        const targetDatabaseId = sessionConfig.config.selectedTrackingDatabase?.value;
        if (taskPageId) {
          updateTaskStatus({ userId: effectiveUserId, pageId: taskPageId, status: "Completed" }).catch(() => undefined);
        }
        const selectedIds = (selectedQuests || []).map(q => q.value);
        const applyComplete = (ids: string[]) => {
          ids.forEach((qid) => {
            updateQuestStatus({ userId: effectiveUserId, questPageId: qid, status: "Completed", adventurePageId, targetDatabaseId }).catch(() => undefined);
          });
        };
        if (selectedIds.length > 0) {
          applyComplete(selectedIds);
        } else if (taskPageId && userIdentifier) {
          const qs = new URLSearchParams({ userId: effectiveUserId, pageId: taskPageId, relationName: "Quests" });
          fetch(`/api/notion/page-relations?${qs.toString()}`)
            .then(r => r.json())
            .then(json => {
              const ids = ((json?.items || []) as Array<{ id: string }>).map(i => i.id);
              if (ids.length > 0) applyComplete(ids);
            })
            .catch(() => undefined);
        }
      } catch (error) {
        console.error("Failed to save session to Notion:", error);
        toast.error("Failed to save session to Notion database", {
          autoClose: 5000,
        });
      }
    } else {
      // Provide a helpful hint when save isn’t configured
      toast.info("Select a Time Tracking database in Session Configuration to auto-save.", {
        autoClose: 4000,
      });
    }
  }, [sessionConfig.isReadyToSave, sessionConfig.saveSessionToNotion, selectedQuests, sessionConfig.config.selectedProject?.value, project?.value, sessionConfig.config.selectedTrackingDatabase?.value, userIdentifier]);

  const { clockifiedValue, togglePlayPause, resetTimer, restartPomo } =
    useSyncPomo(handleSessionComplete);

  const handleQuickComplete = useCallback(async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const selectedSeconds = (sessionValue || 0) * 60;
    const timeLeft = timerValue || 0;
    const duration = Math.max(1, selectedSeconds - timeLeft);
    await handleSessionComplete({
      timerValue: duration,
      startTime: startTime || nowSec,
      endTime: nowSec,
      sessionType: "work",
    });
    restartPomo();
  }, [sessionValue, timerValue, startTime, handleSessionComplete, restartPomo]);

  // prevent screen lock when timer is in focus
  const wakeLock = useRef<WakeLockSentinel>();

  const lockScreen = async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLock.current = await navigator.wakeLock.request("screen");
        wakeLock.current.onrelease = () => {
          setNote("warning");
        };
        setNote("success");
        setTimeout(() => {
          setNote(null);
        }, 5000);
      } catch (error) {
        setNote("error");
        // Wake lock was not allowed.
        // log for development only
        if (process.env.NODE_ENV == "development") console.error(error);
      }
    }
  };

  useEffect(() => {
    // requestWakeLock
    if (isWindowActive) {
      // timer #1 for lockscreen
      setTimeout(() => {
        // if wantLock current is undefined or wakelock is released then lockscreen
        if (!wakeLock.current || wakeLock.current.released) lockScreen();
      }, 1000); //make delay to make interface ready

      // timer #2 for controls
      setTimeout(() => {
        setDisableControls(false);
      }, 2000); //make delay to make interface ready
    } else {
      setDisableControls(true);
    }
  }, [isWindowActive]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => resetTimer(false), [project?.value]);

  // Completed quests UI removed

  function handleTickChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch({
      type: actionTypes.CHANGE_TICKING_SOUND,
      payload: e.target.checked,
    });
  }

  return (
    <div
      className="
      flex
      min-w-[350px] flex-col items-center justify-items-center 
      gap-5 p-5 text-center
      "
    >
      <Head>
        <title>
          {clockifiedValue} - {projectName}
        </title>
      </Head>

      {showNote && (
        <WakeLockNote type={showNote} onCloseClick={() => setNote(null)} />
      )}

      <FullScreen handle={timerScreen}>
        <div
          className={`${
            timerScreen.active
              ? "flex h-screen w-screen flex-col items-center justify-center bg-gray-900 text-white"
              : ""
          }`}
        >
          {timerScreen.active && (
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold">{projectName}</h1>
              <div className="mt-4 text-6xl font-mono">
                {clockifiedValue}
              </div>
            </div>
          )}

          <div
            className={`${
              timerScreen.active ? "hidden" : "flex"
            } flex-col items-center gap-5`}
          >
            {/* Single Card Design */}
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
              {/* Project Title */}
              <h2 className="mb-6 text-center text-xl font-semibold text-gray-800">
                {projectName}
              </h2>

              {/* Circular Timer Display */}
              <div className="mb-8 flex justify-center">
                <div className="relative h-48 w-48 rounded-full bg-gray-800 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-sm font-medium mb-2">{timerLabel}</div>
                    <div className="text-4xl font-mono font-bold">
                      {clockifiedValue}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="mb-8 flex justify-center">
                <Controls
                  disableControls={disableControls}
                  handlePlayPause={togglePlayPause}
                  handleReset={resetTimer}
                  handleRestart={handleQuickComplete}
                />
              </div>

              {/* Session and Break Length Controls */}
              <div className="mb-6 flex justify-between">
                <div className="flex flex-col items-center">
                  <h3 className="mb-2 text-sm font-medium text-gray-600">Break Length</h3>
                  <div className="flex items-center gap-2">
                    <Break />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="mb-2 text-sm font-medium text-gray-600">Session Length</h3>
                  <div className="flex items-center gap-2">
                    <Session />
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={shouldTickSound}
                    onChange={handleTickChange}
                    text="Ticking"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <OutsideClickHandler
                    onOutsideClick={() => {
                      setPopover(false);
                    }}
                  >
                    <div className="relative">
                      <SpeakerWaveIcon
                        onClick={() => setPopover(!showPopover)}
                        className="h-5 w-5 cursor-pointer text-gray-600"
                      />
                      <PopOver visible={showPopover} 
                        defaultValue={tickVolume * 100}
                        value={"tick-volume"}
                        disabled={!shouldTickSound}
                        handleChange={(level: number) => {
                          dispatch({ type: actionTypes.CHANGE_TICK_VOLUME, payload: level });
                        }}
                      />
                    </div>
                  </OutsideClickHandler>
                  <button
                    onClick={timerScreen.enter}
                    className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-700"
                  >
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Relevant Quests Completed section removed */}
            </div>

            {/* Session Configuration */}
            <div className="w-full max-w-md">
              <PomoSessionConfigComp
                selectedTags={sessionConfig.config.selectedTags}
                availableTags={availableTags}
                onTagsSelect={sessionConfig.setSelectedTags}
                projects={projects}
                selectedProject={sessionConfig.config.selectedProject}
                selectedQuests={sessionConfig.config.selectedQuests}
                onProjectSelect={sessionConfig.setSelectedProject}
                onQuestsSelect={sessionConfig.setSelectedQuests}
                selectedDatabase={sessionConfig.config.selectedDatabase}
                selectedTrackingDatabase={sessionConfig.config.selectedTrackingDatabase}
                availableDatabases={sessionConfig.availableDatabases}
                onDatabaseSelect={sessionConfig.setSelectedDatabase}
                onTrackingDatabaseSelect={sessionConfig.setSelectedTrackingDatabase}
                isExpanded={sessionConfig.config.isExpanded}
                onToggleExpanded={() => sessionConfig.setIsExpanded(!sessionConfig.config.isExpanded)}
                disabled={disableControls}
                lockStatusDatabase={true}
              />
            </div>
          </div>

          {timerScreen.active && (
            <button
              onClick={timerScreen.exit}
              className="mt-8 flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              <ArrowsPointingInIcon className="h-4 w-4" />
              Exit Fullscreen
            </button>
          )}
        </div>
      </FullScreen>
    </div>
  );
}

interface PopOverProps {
  visible?: boolean;
  defaultValue: number;
  value: string;
  disabled?: boolean;
  handleChange: (level: number) => void;
}

function PopOver({ visible = false, defaultValue, value, disabled, handleChange }: PopOverProps) {
  return (
    <div
      className={`${
        visible ? "block" : "hidden"
      } absolute bottom-8 left-1/2 z-10 w-48 -translate-x-1/2 transform rounded-lg border border-gray-200 bg-white p-3 shadow-lg`}
    >
      <SoundLevel defaultValue={defaultValue} value={value} disabled={disabled} handleChange={handleChange} />
    </div>
  );
}
