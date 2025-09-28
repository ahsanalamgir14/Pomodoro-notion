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
  projects: ProjectOption[];
  onProjectSelect: (project: ProjectOption | null) => void;
  
  // Tag selection
  selectedTags: TagOption[];
  availableTags: TagOption[];
  onTagsSelect: (tags: TagOption[]) => void;
  
  // Database selection
  selectedDatabase: DatabaseOption | null;
  availableDatabases: DatabaseOption[];
  onDatabaseSelect: (database: DatabaseOption | null) => void;
  
  // General props
  disabled?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export default function PomoSessionConfig({
  selectedProject,
  projects,
  onProjectSelect,
  selectedTags,
  availableTags,
  onTagsSelect,
  selectedDatabase,
  availableDatabases,
  onDatabaseSelect,
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
          {/* Project Selection */}
          <div>
            <ProjectSelection
              disabled={disabled}
              value={selectedProject}
              handleSelect={onProjectSelect}
              projects={projects}
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
            />
          </div>

          {/* Save to Notion Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save-to-notion"
                checked={!!selectedDatabase}
                onChange={(e) => {
                  if (!e.target.checked) {
                    onDatabaseSelect(null);
                  }
                }}
                disabled={disabled}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="save-to-notion" className="text-sm text-gray-700">
                Save session to Notion
              </label>
            </div>
            {selectedProject && selectedDatabase && (
              <span className="text-xs text-green-600 font-medium">
                ✓ Ready to save
              </span>
            )}
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <p>
              Configure how your Pomodoro sessions will be saved to Notion. 
              Select a project, add relevant tags, and choose the target database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}