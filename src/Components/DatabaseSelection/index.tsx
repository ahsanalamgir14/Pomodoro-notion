import React from "react";
import Select from "react-select";

interface DatabaseOption {
  label: string;
  value: string;
  icon?: string | null;
}

interface DatabaseSelectionProps {
  value: DatabaseOption | null;
  databases: DatabaseOption[];
  disabled?: boolean;
  handleSelect: (database: DatabaseOption | null) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
}

const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "white",
    borderColor: state.isFocused ? "#8B5CF6" : "#D1D5DB",
    boxShadow: state.isFocused ? "0 0 0 1px #8B5CF6" : "none",
    "&:hover": {
      borderColor: "#8B5CF6",
    },
    minHeight: "42px",
    borderRadius: "8px",
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#8B5CF6"
      : state.isFocused
      ? "#F3F4F6"
      : "white",
    color: state.isSelected ? "white" : "#374151",
    "&:hover": {
      backgroundColor: state.isSelected ? "#8B5CF6" : "#F3F4F6",
    },
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: "#9CA3AF",
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: "#374151",
  }),
};

export default function DatabaseSelection({
  value,
  databases,
  disabled = false,
  handleSelect,
  placeholder = "Select database to save to...",
  label = "Target Database",
  helperText = "Choose which Notion database to save your Pomodoro session to",
}: DatabaseSelectionProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <Select
        value={value}
        onChange={handleSelect}
        options={databases}
        isDisabled={disabled}
        isClearable
        placeholder={placeholder}
        styles={customStyles}
        className="w-full"
        classNamePrefix="database-select"
        noOptionsMessage={() => "No databases available"}
        formatOptionLabel={(option: DatabaseOption) => (
          <div className="flex items-center gap-2">
            {option.icon && (
              <span className="text-lg">{option.icon}</span>
            )}
            <span>{option.label}</span>
          </div>
        )}
      />
      <p className="text-xs text-gray-500 mt-1">
        {helperText}
      </p>
    </div>
  );
}