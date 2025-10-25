// Simple classic Worker that schedules and clears setInterval callbacks

/** @type {{ id: string, name: string, delay?: number }} */
// interval work payload structure

/** @typedef {{ id: string, intervalId: number }} ScheduledIntervalWork */
/** @type {ScheduledIntervalWork[]} */
const scheduledIntervalWorks = [];

self.onmessage = (event) => {
  const intervalWork = event && event.data;
  if (!intervalWork || !intervalWork.name) return;

  switch (intervalWork.name) {
    case "setInterval": {
      intervalWork.name = "runCallback";
      const intervalId = setInterval(() => {
        self.postMessage(intervalWork);
      }, intervalWork.delay);
      scheduledIntervalWorks.push({ id: intervalWork.id, intervalId });
      break;
    }
    case "clearInterval": {
      const idx = scheduledIntervalWorks.findIndex((x) => x.id === intervalWork.id);
      if (idx >= 0) {
        clearInterval(scheduledIntervalWorks[idx].intervalId);
        scheduledIntervalWorks.splice(idx, 1);
      }
      break;
    }
    default:
      break;
  }
};