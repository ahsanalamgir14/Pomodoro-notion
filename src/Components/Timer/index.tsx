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
import { usePomoSessionConfig } from "../../hooks/usePomoSessionConfig";
import Break from "../Break";
import Controls from "../Controls";
import SoundLevel from "../Noises/NoiseCard/SoundLevel";
import Session from "../Session";
import Switch from "../Switch";
import WakeLockNote from "./WakeLockNote";
import Clock from "../Clock";
import PomoSessionConfig from "../PomoSessionConfig";

type Props = {
  projectName: string;
  projects?: Array<{ label: string; value: string }>;
  availableTags?: Array<{ label: string; value: string; color: string }>;
  selectedTags?: Array<{ label: string; value: string; color: string }>;
  currentDatabaseId?: string;
};

export default function Timer({ 
  projectName, 
  projects = [], 
  availableTags = [], 
  selectedTags = [], 
  currentDatabaseId 
}: Props) {
  const timerScreen = useFullScreenHandle();

  const [{ timerLabel, project, shouldTickSound }, dispatch] = usePomoState();



  const isWindowActive = useWindowActive();

  const [disableControls, setDisableControls] = useState(false);

  const [showPopover, setPopover] = useState(false);
  const [showNote, setNote] = useState<
    null | "success" | "error" | "warning"
  >();

  // Initialize session configuration hook
  const sessionConfig = usePomoSessionConfig({
    projects,
    availableTags,
    selectedTags,
    currentDatabaseId,
  });

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
      } catch (error) {
        console.error("Failed to save session to Notion:", error);
        toast.error("Failed to save session to Notion database", {
          autoClose: 5000,
        });
      }
    }
  }, [sessionConfig.isReadyToSave, sessionConfig.saveSessionToNotion]);

  const { clockifiedValue, togglePlayPause, resetTimer, restartPomo } =
    useSyncPomo();

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
            {/* Session Configuration */}
            <PomoSessionConfig
              projects={projects}
              availableTags={availableTags}
              selectedTags={selectedTags}
              selectedProject={sessionConfig.selectedProject}
              selectedDatabase={sessionConfig.selectedDatabase}
              onProjectSelect={sessionConfig.setSelectedProject}
              onTagsSelect={sessionConfig.setSelectedTags}
              onDatabaseSelect={sessionConfig.setSelectedDatabase}
              isExpanded={sessionConfig.isExpanded}
              onToggleExpanded={sessionConfig.toggleExpanded}
              disabled={disableControls}
              isSaving={sessionConfig.isSaving}
            />

            <Container title={timerLabel}>
              <div className="flex flex-col items-center gap-5">
                <Clock />
                <Controls
                  disableControls={disableControls}
                  handlePlayPause={togglePlayPause}
                  handleReset={resetTimer}
                  handleRestart={restartPomo}
                />
              </div>
            </Container>

            <Container title="Session Length">
              <Session />
            </Container>

            <Container title="Break Length">
              <Break />
            </Container>

            <Container title="Volume">
              <div className="flex items-center gap-3">
                <OutsideClickHandler
                  onOutsideClick={() => {
                    setPopover(false);
                  }}
                >
                  <div className="relative">
                    <SpeakerWaveIcon
                      onClick={() => setPopover(!showPopover)}
                      className="h-6 w-6 cursor-pointer text-gray-700"
                    />
                    <PopOver visible={showPopover} />
                  </div>
                </OutsideClickHandler>
                <Switch
                  checked={shouldTickSound}
                  onChange={handleTickChange}
                  label="Tick Sound"
                />
              </div>
            </Container>

            <div className="flex items-center gap-3">
              <button
                onClick={timerScreen.enter}
                className="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
                Fullscreen
              </button>
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

function Container({
  children,
  title,
}: {
  title: string;
  children: JSX.Element | React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      {children}
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
