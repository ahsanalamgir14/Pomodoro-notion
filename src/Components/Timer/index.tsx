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
import PomoSessionConfig from "../PomoSessionConfig";
import { usePomoSessionConfig } from "../../hooks/usePomoSessionConfig";
import { getCompletedQuests, startQuestWork } from "../../utils/apis/notion/client";

type Props = {
  projectName: string;
  projects?: Array<{ label: string; value: string }>;
  availableTags?: Array<{ label: string; value: string; color: string }>;
  selectedTags?: Array<{ label: string; value: string; color: string }>;
  currentDatabaseId?: string;
  availableDatabases?: Array<{ id: string; title: string; icon?: string }>;
};

export default function Timer({ 
  projectName,
  projects = [],
  availableTags = [],
  selectedTags = [],
  currentDatabaseId,
  availableDatabases = []
}: Props) {
  const timerScreen = useFullScreenHandle();

  const [{ timerLabel, project, shouldTickSound, busyIndicator, startTime }, dispatch] = usePomoState();



  const isWindowActive = useWindowActive();

  const [disableControls, setDisableControls] = useState(false);

  const [showPopover, setPopover] = useState(false);
  const [showNote, setNote] = useState<
    null | "success" | "error" | "warning"
  >();

  const [completedSummary, setCompletedSummary] = useState<{ count: number; items: Array<{ id: string; title: string }> } | null>(null);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  // Initialize session configuration hook
  const sessionConfig = usePomoSessionConfig({
    projects,
    availableTags,
    selectedTags,
    currentDatabaseId,
    availableDatabases,
  });

  const refreshCompleted = useCallback(async () => {
    if (!sessionConfig.config.selectedProject?.value || !currentDatabaseId) {
      setCompletedSummary(null);
      return;
    }
    try {
      setLoadingCompleted(true);
      const data = await getCompletedQuests({
        userId: "notion-user",
        databaseId: currentDatabaseId!,
        adventurePageId: sessionConfig.config.selectedProject.value,
      });
      setCompletedSummary(data);
    } catch (e) {
      setCompletedSummary(null);
    } finally {
      setLoadingCompleted(false);
    }
  }, [sessionConfig.config.selectedProject?.value, currentDatabaseId]);

  // When the timer transitions from stopped to started, create a live entry with proper Quest relation
  const prevBusy = useRef(false);
  const lastStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    const justStarted = busyIndicator && !prevBusy.current;
    if (justStarted) {
      // Avoid duplicate creation on resume by ensuring startTime changed
      if (lastStartTimeRef.current === startTime) {
        prevBusy.current = busyIndicator;
        return;
      }
      const adventurePageId = sessionConfig.config.selectedProject?.value;
      const targetDatabaseId = sessionConfig.config.selectedDatabase?.value || currentDatabaseId;
      const projectTitle = sessionConfig.config.selectedProject?.label || projectName;
      // Treat selected project as Adventure; link the active Quest once identified
      const questPageId = project?.value || adventurePageId; // fallback if UI chooses quest directly
      if (questPageId && targetDatabaseId) {
        startQuestWork({ userId: "notion-user", questPageId, targetDatabaseId, projectTitle, adventurePageId })
          .catch((e) => {
            if (process.env.NODE_ENV === "development") {
              console.warn("Failed to create tracker entry on start:", e);
            }
          });
        lastStartTimeRef.current = startTime;
      }
    }
    prevBusy.current = busyIndicator;
  }, [busyIndicator, startTime, sessionConfig.config.selectedProject?.value, sessionConfig.config.selectedDatabase?.value, sessionConfig.config.selectedProject?.label, projectName, currentDatabaseId]);

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
        // Refresh completed quests after a successful save
        refreshCompleted();
      } catch (error) {
        console.error("Failed to save session to Notion:", error);
        toast.error("Failed to save session to Notion database", {
          autoClose: 5000,
        });
      }
    }
  }, [sessionConfig.isReadyToSave, sessionConfig.saveSessionToNotion, refreshCompleted]);

  const { clockifiedValue, togglePlayPause, resetTimer, restartPomo } =
    useSyncPomo(handleSessionComplete);

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

  // Fetch completed quests relevant to the selected project and database
  useEffect(() => {
    refreshCompleted();
  }, [refreshCompleted]);

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

      <WakeLockNote showNote={showNote} />

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
                  handleRestart={restartPomo}
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
                    label="Ticking"
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
                      <PopOver visible={showPopover} />
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

              {/* Relevant Quests Completed */}
              <div className="mt-6 border-t pt-4 text-left">
                <h3 className="text-sm font-medium text-gray-700">Relevant quests completed</h3>
                {loadingCompleted && (
                  <p className="mt-2 text-xs text-gray-500">Loading…</p>
                )}
                {!loadingCompleted && completedSummary && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Total: {completedSummary.count}</p>
                    {completedSummary.items.length > 0 && (
                      <ul className="mt-2 list-disc pl-5">
                        {completedSummary.items.slice(0, 5).map(item => (
                          <li key={item.id} className="text-sm text-gray-700">{item.title}</li>
                        ))}
                      </ul>
                    )}
                    {completedSummary.items.length === 0 && (
                      <p className="text-xs text-gray-500">No completed quests for this adventure yet.</p>
                    )}
                  </div>
                )}
                {!loadingCompleted && !completedSummary && (
                  <p className="mt-2 text-xs text-gray-500">Select a project and database to see completed quests.</p>
                )}
              </div>
            </div>

            {/* Session Configuration */}
            <div className="w-full max-w-md">
              <PomoSessionConfig
                projects={projects}
                availableTags={availableTags}
                selectedTags={selectedTags}
                selectedProject={sessionConfig.config.selectedProject}
                selectedDatabase={sessionConfig.config.selectedDatabase}
                availableDatabases={sessionConfig.availableDatabases}
                onProjectSelect={sessionConfig.setSelectedProject}
                onTagsSelect={sessionConfig.setSelectedTags}
                onDatabaseSelect={sessionConfig.setSelectedDatabase}
                isExpanded={sessionConfig.config.isExpanded}
                onToggleExpanded={sessionConfig.setIsExpanded}
                disabled={disableControls}
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


function PopOver({ visible } = { visible: false }) {
  return (
    <div
      className={`${
        visible ? "block" : "hidden"
      } absolute bottom-8 left-1/2 z-10 w-48 -translate-x-1/2 transform rounded-lg border border-gray-200 bg-white p-3 shadow-lg`}
    >
      <SoundLevel />
    </div>
  );
}
