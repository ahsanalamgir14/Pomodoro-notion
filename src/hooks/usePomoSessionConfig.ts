import { useState, useEffect, useCallback } from "react";
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
  isExpanded: boolean;
}

export interface UsePomoSessionConfigReturn {
  config: PomoSessionConfig;
  availableDatabases: DatabaseOption[];
  isLoadingDatabases: boolean;
  setSelectedProject: (project: ProjectOption | null) => void;
  setSelectedTags: (tags: TagOption[]) => void;
  setSelectedDatabase: (database: DatabaseOption | null) => void;
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
}: {
  projects: ProjectOption[];
  availableTags: TagOption[];
  selectedTags: TagOption[];
  currentDatabaseId?: string;
}): UsePomoSessionConfigReturn => {
  const [config, setConfig] = useState<PomoSessionConfig>({
    selectedProject: null,
    selectedTags: [],
    selectedDatabase: null,
    isExpanded: false,
  });

  // Use the passed availableTags as available databases for now
  // In a real implementation, this would come from the parent component
  const availableDatabases: DatabaseOption[] = [];
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

  const setIsExpanded = useCallback((expanded: boolean) => {
    setConfig(prev => ({ ...prev, isExpanded: expanded }));
  }, []);

  const saveSessionToNotion = useCallback(async (sessionData: {
    timerValue: number;
    startTime: number;
    endTime?: number;
    sessionType: "work" | "break";
  }) => {
    if (!config.selectedProject) {
      throw new Error("Project must be selected");
    }

    const saveParams = {
      projectId: config.selectedProject.value,
      projectTitle: config.selectedProject.label,
      databaseId: currentDatabaseId || "",
      userId: "notion-user", // Use the same identifier as the rest of the app
      timerValue: sessionData.timerValue,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      selectedTags: config.selectedTags,
      targetDatabaseId: currentDatabaseId || "",
      sessionType: sessionData.sessionType,
    };

    await savePomoSessionToNotion(saveParams);
  }, [config, currentDatabaseId]);

  const isReadyToSave = Boolean(
    config.selectedProject &&
    currentDatabaseId
  );

  return {
    config,
    availableDatabases,
    isLoadingDatabases,
    setSelectedProject,
    setSelectedTags,
    setSelectedDatabase,
    setIsExpanded,
    saveSessionToNotion,
    isReadyToSave,
  };
};