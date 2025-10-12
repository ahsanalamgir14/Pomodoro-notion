import { useState, useEffect, useCallback } from "react";
import { usePomoState } from "../utils/Context/PomoContext/Context";
import { getAvailableDatabases, savePomoSessionToNotion } from "../utils/apis/notion/client";

export interface ProjectOption {
  label: string;
  value: string;
}

export interface TagOption {
  label: string;
  value: string;
  color: string;
}

export interface DatabaseOption {
  label: string;
  value: string;
  icon?: string;
}

export interface PomoSessionConfig {
  selectedProject: ProjectOption | null;
  selectedTags: TagOption[];
  selectedDatabase: DatabaseOption | null;
  selectedTrackingDatabase: DatabaseOption | null;
  isExpanded: boolean;
}

export interface UsePomoSessionConfigReturn {
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
}

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
  availableDatabases?: Array<{ id: string; title: string; icon?: string }>;
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
  const convertedDatabases: DatabaseOption[] = availableDatabases.map(db => ({
    label: db.title,
    value: db.id,
    icon: db.icon,
  }));

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

  const saveSessionToNotion = useCallback(async (sessionData: {
    timerValue: number;
    startTime: number;
    endTime?: number;
    sessionType: "work" | "break";
  }) => {
    if (!config.selectedProject) {
      throw new Error("Project must be selected");
    }

    // Use user-selected tracking database as the time tracker destination
    const targetDb = config.selectedTrackingDatabase?.value || "";
    const saveParams = {
      projectId: config.selectedProject.value,
      projectTitle: config.selectedProject.label,
      databaseId: targetDb,
      userId: "notion-user", // Use the same identifier as the rest of the app
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
    config.selectedProject &&
    config.selectedTrackingDatabase?.value
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