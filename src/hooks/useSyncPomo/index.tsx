// this will do jobs regarding synchronization and working with pomodoro timer
// save project timeline on pause

import { useRef } from "react";
import { toast } from "react-toastify";
import { usePomoState } from "../../utils/Context/PomoContext/Context";
import {
  actionTypes,
  TimerLabelType,
} from "../../utils/Context/PomoContext/reducer";
import usePomoDoro from "../Pomodoro/usePomoDoro";
import useClickSound from "../Sound/useClickSound";
import useNotificationSound from "../Sound/useNotificationSound";
import { usePomoClient } from "../Storage/usePomoClient";
import useNotification from "../useNotification";

export default function useSyncPomo(onSessionComplete?: (sessionData: {
  timerValue: number;
  startTime: number;
  endTime: number;
  sessionType: "work" | "break";
}) => void) {
  const [
    { project, databaseId, startTime, timerValue, sessionValue },
    pomoDispatch,
  ] = usePomoState();
  const pomoDoroResult = usePomoDoro({
    onEnd,
    onPomoPause,
    onStart,
    onReset,
  });
  
  console.log("useSyncPomo - pomoDoroResult:", pomoDoroResult);
  
  const { clockifiedValue, handlePlayPause, resetTimer, restartPomo } = pomoDoroResult;
  
  // Debug logging
  console.log("useSyncPomo - handlePlayPause:", typeof handlePlayPause, handlePlayPause);

  const [refetch, addTimesheet] = usePomoClient();

  const [showNotification] = useNotification();

  const {
    tickingSlow: { play: tickingSlowPlay, stop: tickingSlowStop },
  } = useClickSound();

  const { bellRingPlay, alarmWoodPlay } = useNotificationSound();

  const elapsedTime = useRef(0);

  function togglePlayPause() {
    console.log("togglePlayPause called, handlePlayPause:", typeof handlePlayPause);
    if (typeof handlePlayPause === 'function') {
      handlePlayPause();
    } else {
      console.error("handlePlayPause is not a function:", handlePlayPause);
      // Fallback: try to get the function from the result again
      const { handlePlayPause: fallbackHandlePlayPause } = pomoDoroResult;
      if (typeof fallbackHandlePlayPause === 'function') {
        console.log("Using fallback handlePlayPause");
        fallbackHandlePlayPause();
      } else {
        console.error("Fallback handlePlayPause also not a function:", fallbackHandlePlayPause);
      }
    }
  }

  function onPomoPause(type: TimerLabelType) {
    tickingSlowStop();
    if (type == "Session") {
      //when session ends save session time
      saveProjectTime();
    }
  }

  // this will be excecuted when sessions switch happens during running pomo

  function onEnd(type: TimerLabelType) {
    showNotification(`${type} Completed`, "Pomo Complete");
    if (type == "Session") {
      saveProjectTime();
      
      // Call session completion callback if provided
      if (onSessionComplete) {
        const endTime = Math.floor(new Date().getTime() / 1000);
        const sessionDuration = getSessionInSecond() - timerValue - elapsedTime.current;
        onSessionComplete({
          timerValue: sessionDuration,
          startTime: startTime,
          endTime: endTime,
          sessionType: "work"
        });
      }
      
      //when session ends save session time
      bellRingPlay();
    } else {
      alarmWoodPlay();
      //reset start time when noise to session happens
      pomoDispatch({
        type: actionTypes.SET_START_TIME,
        payload: Math.round(new Date().getTime() / 1000),
      });
    }
  }

  function onStart() {
    setTimeout(tickingSlowPlay, 1000);
    pomoDispatch({
      type: actionTypes.SET_START_TIME,
      payload: Math.round(new Date().getTime() / 1000),
    });
  }

  const getSessionInSecond = () => sessionValue * 60;

  function onReset(wasRunning: boolean, type: TimerLabelType) {
    tickingSlowStop();
    if (wasRunning && type == "Session") saveProjectTime(); //only save project time if it was running
    elapsedTime.current = 0; //reset whatever time spent on session when reset pomodoro
  }

  function saveProjectTime() {
    // persist project timer
    if (project?.value) {
      addTimesheet(
        project.value,
        databaseId as string,
        getSessionInSecond() - timerValue - elapsedTime.current,
        startTime,
        Math.floor(new Date().getTime() / 1000)
      )
        .then(() => {
          toast.success(`Timesheet added ${project.label}`, {
            autoClose: false,
          });
          setTimeout(refetch, 3000); //refetch after 3 sec
        })
        .catch(() =>
          toast.error(`Timesheet upload error ${project.label}`, {
            autoClose: false,
          })
        );
      // even if api fails reset elapsed timer
      elapsedTime.current =
        timerValue == 0 ? 0 : getSessionInSecond() - timerValue; //if timer value is having some value then delete session time from there
    }
  }

  return { clockifiedValue, togglePlayPause, resetTimer, restartPomo };
}
