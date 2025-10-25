import React, { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";

// Dynamic imports to avoid SSR issues
const ProjectSelection = dynamic(
  () => import("../ProjectSelection"),
  { loading: () => <div>Loading...</div> }
);

const NotionTags = dynamic(
  () => import("../NotionTags"),
  { loading: () => <div>Loading...</div> }
);

const DatabaseSelection = dynamic(
  () => import("../DatabaseSelection"),
  { loading: () => <div>Loading...</div> }
);

const QuestSelection = dynamic(
  () => import("../QuestSelection"),
  { loading: () => <div>Loading...</div> }
);

interface ProjectOption {
  label: string;
  value: string;
}

interface TagOption {
  label: string;
  value: string;
  color: string;
}

interface DatabaseOption {
  label: string;
  value: string;
  icon?: string;
}

interface PomoSessionConfigProps {
  // Project selection
  selectedProject: ProjectOption | null;
  selectedQuests?: ProjectOption[];
  projects: ProjectOption[];
  onProjectSelect: (project: ProjectOption | null) => void;
  onQuestsSelect?: (quests: ProjectOption[]) => void;
  
  // Tag selection
  selectedTags: TagOption[];
  availableTags: TagOption[];
  onTagsSelect: (tags: TagOption[]) => void;
  
  // Database selection
  selectedDatabase: DatabaseOption | null;
  selectedTrackingDatabase?: DatabaseOption | null;
  availableDatabases: DatabaseOption[];
  onDatabaseSelect: (database: DatabaseOption | null) => void;
  onTrackingDatabaseSelect?: (database: DatabaseOption | null) => void;
  
  // General props
  disabled?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export default function PomoSessionConfig({
  selectedProject,
  selectedQuests,
  projects,
  onProjectSelect,
  onQuestsSelect,
  selectedTags,
  availableTags,
  onTagsSelect,
  selectedDatabase,
  selectedTrackingDatabase,
  availableDatabases,
  onDatabaseSelect,
  onTrackingDatabaseSelect,
  disabled = false,
  isExpanded = false,
  onToggleExpanded
}: PomoSessionConfigProps) {
  const [internalExpanded, setInternalExpanded] = useState(isExpanded);
  
  const expanded = onToggleExpanded ? isExpanded : internalExpanded;
  const toggleExpanded = onToggleExpanded || (() => setInternalExpanded(!internalExpanded));

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Session Configuration
          </span>
          {selectedDatabase && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {selectedDatabase.label}
            </span>
          )}
          {selectedTrackingDatabase && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {selectedTrackingDatabase.label}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          {/* Quest Relation Selection (shown before Project, disabled until Project selected) */}
          {onQuestsSelect && (
            <div>
              <QuestSelection
                disabled={disabled || !selectedProject}
                projectId={selectedProject?.value || null}
                values={selectedQuests || []}
                onChange={onQuestsSelect}
              />
            </div>
          )}

          {/* Project Selection */}
          <div>
            <ProjectSelection
              disabled={disabled}
              value={selectedProject as unknown as Record<string, unknown>}
              handleSelect={onProjectSelect}
              projects={projects as unknown as Array<Record<string, unknown>>}
            />
          </div>

          {/* Tags Selection */}
          <div>
            <NotionTags
              disabled={disabled}
              handleSelect={onTagsSelect}
              options={availableTags}
              selectedOptions={selectedTags}
            />
          </div>

          {/* Database Selection */}
          <div>
            <DatabaseSelection
              disabled={disabled}
              value={selectedDatabase}
              handleSelect={onDatabaseSelect}
              databases={availableDatabases}
              placeholder="Select status database (Adventure/Quest)"
              label="Status Database"
              helperText="Used to find quests and link relations"
            />
          </div>

          {/* Time Tracking Database Selection */}
          {onTrackingDatabaseSelect && (
            <div>
              <DatabaseSelection
                disabled={disabled}
                value={selectedTrackingDatabase || null}
                handleSelect={onTrackingDatabaseSelect}
                databases={availableDatabases}
                placeholder="Select Time Tracking database"
                label="Time Tracking Database"
                helperText="Where completed sessions are saved"
              />
            </div>
          )}

          {/* Status & Tracking DB Summary */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span>Status DB: {selectedDatabase ? selectedDatabase.label : "None"}</span>
              <span>•</span>
              <span>Tracking DB: {selectedTrackingDatabase ? selectedTrackingDatabase.label : "None"}</span>
            </div>
            {selectedProject && selectedDatabase && selectedTrackingDatabase && (
              <span className="text-xs text-green-600 font-medium">
                ✓ Ready to save
              </span>
            )}
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <p>
              Configure how your Pomodoro sessions will be saved to Notion. 
              Select a project, add relevant tags, choose the status database, and pick a Time Tracking database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}