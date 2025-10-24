import { useCallback, useEffect, useMemo, useState } from "react";
import { usePomoState } from "../utils/Context/PomoContext/Context";

export type ProjectOption = { label: string; value: string };
export type TagOption = { label: string; value: string };
export type DatabaseOption = { label: string; value: string; icon?: string | null };

export type PomoSessionConfig = {
  selectedProject: ProjectOption | null;
  selectedTags: TagOption[];
  selectedDatabase: DatabaseOption | null; // Status/source DB
  selectedTrackingDatabase: DatabaseOption | null; // Time tracker/target DB
  isExpanded: boolean;
};

export type UsePomoSessionConfigReturn = {
  config: PomoSessionConfig;
  availableDatabases: DatabaseOption[];
  isLoadingDatabases: boolean;
  setSelectedProject: (project: ProjectOption | null) => void;
  setSelectedTags: (tags: TagOption[]) => void;
  setSelectedDatabase: (database: DatabaseOption | null) => void;
  setSelectedTrackingDatabase: (database: DatabaseOption | null) => void;
  setIsExpanded: (expanded: boolean) => void;
  saveSessionToNotion: (sessionData: {
    timerValue: number;
    startTime: number;
    endTime?: number;
    sessionType: "work" | "break";
  }) => Promise<void>;
  isReadyToSave: boolean;
};

import { savePomoSessionToNotion } from "../utils/apis/notion/client";

export const usePomoSessionConfig = ({
  projects,
  availableTags,
  selectedTags,
  currentDatabaseId,
  availableDatabases = [],
}: {
  projects: ProjectOption[];
  availableTags: TagOption[];
  selectedTags: TagOption[];
  currentDatabaseId?: string;
  availableDatabases?: Array<{ id: string; title: string; icon?: string | null }>;
}): UsePomoSessionConfigReturn => {
  const [{ project }] = usePomoState();
  const [config, setConfig] = useState<PomoSessionConfig>({
    selectedProject: null,
    selectedTags: [],
    selectedDatabase: null,
    selectedTrackingDatabase: null,
    isExpanded: false,
  });

  // Convert availableDatabases to the expected format
  const convertedDatabases: DatabaseOption[] = useMemo(
    () => availableDatabases.map(db => ({
      label: db.title,
      value: db.id,
      icon: db.icon ?? null,
    })),
    [availableDatabases]
  );

  const isLoadingDatabases = false;

  const setSelectedProject = useCallback((project: ProjectOption | null) => {
    setConfig(prev => ({ ...prev, selectedProject: project }));
  }, []);

  const setSelectedTags = useCallback((tags: TagOption[]) => {
    setConfig(prev => ({ ...prev, selectedTags: tags }));
  }, []);

  const setSelectedDatabase = useCallback((database: DatabaseOption | null) => {
    setConfig(prev => ({ ...prev, selectedDatabase: database }));
  }, []);

  const setSelectedTrackingDatabase = useCallback((database: DatabaseOption | null) => {
    setConfig(prev => ({ ...prev, selectedTrackingDatabase: database }));
  }, []);

  const setIsExpanded = useCallback((expanded: boolean) => {
    setConfig(prev => ({ ...prev, isExpanded: expanded }));
  }, []);

  // Sync selected project from global Pomo context
  useEffect(() => {
    if (project && (!config.selectedProject || config.selectedProject.value !== project.value)) {
      setConfig(prev => ({ ...prev, selectedProject: project as ProjectOption }));
    }
  }, [project]);

  // Initialize/sync selected tags from upstream props (page-level selection)
  useEffect(() => {
    if (selectedTags && selectedTags.length >= 0) {
      setConfig(prev => ({ ...prev, selectedTags }));
    }
  }, [selectedTags]);

  // Default Status DB from current page/databaseId when available
  useEffect(() => {
    if (!config.selectedDatabase && currentDatabaseId && convertedDatabases.length > 0) {
      const match = convertedDatabases.find(d => d.value === currentDatabaseId);
      if (match) {
        setConfig(prev => ({
          ...prev,
          selectedDatabase: match,
        }));
      }
    }
  }, [currentDatabaseId, convertedDatabases, config.selectedDatabase]);

  const saveSessionToNotion = useCallback(async (sessionData: {
    timerValue: number;
    startTime: number;
    endTime?: number;
    sessionType: "work" | "break";
  }) => {
    if (!config.selectedProject) {
      throw new Error("Project must be selected");
    }

    if (!config.selectedTrackingDatabase?.value) {
      throw new Error("Time Tracking database must be selected");
    }

    const sourceDb = config.selectedDatabase?.value || currentDatabaseId || ""; // source/status DB for relations
    const targetDb = config.selectedTrackingDatabase.value; // target time tracker DB

    const saveParams = {
      projectId: config.selectedProject.value,
      projectTitle: config.selectedProject.label,
      databaseId: sourceDb,
      userId: "notion-user", // demo identifier used across the app
      timerValue: sessionData.timerValue,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      targetDatabaseId: targetDb,
      status: "Completed",
      notes: "",
      tags: (config.selectedTags || []).map(t => t.label),
    };

    await savePomoSessionToNotion(saveParams);
  }, [config, currentDatabaseId]);

  const isReadyToSave = Boolean(
    config.selectedProject && config.selectedDatabase?.value && config.selectedTrackingDatabase?.value
  );

  return {
    config,
    availableDatabases: convertedDatabases,
    isLoadingDatabases,
    setSelectedProject,
    setSelectedTags,
    setSelectedDatabase,
    setSelectedTrackingDatabase,
    setIsExpanded,
    saveSessionToNotion,
    isReadyToSave,
  };
};