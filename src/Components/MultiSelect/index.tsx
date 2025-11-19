import React from "react";
import chroma, { Color } from "chroma-js";

export interface ColourOption {
  readonly value: string;
  readonly label: string;
  readonly color: string;
  readonly isFixed?: boolean;
  readonly isDisabled?: boolean;
}

import Select, { StylesConfig } from "react-select";

const colourStyles = (theme: "light" | "dark" = "light", controlWidth?: number | string): StylesConfig<ColourOption, true> => ({
  control: (styles) => {
    return {
      ...styles,
      fontWeight: 400,
      width: controlWidth ?? "100%",
      boxShadow: "unset",
      cursor: "pointer",
      margin: "unset",
      backgroundColor: theme === "dark" ? "#111827" : "white",
      color: theme === "dark" ? "#f9fafb" : "#111827",
      border: theme === "dark" ? `1px solid #4b5563` : `1px solid #DAE6EF`,
      "&:hover": {
        fontWeight: 0,
        backgroundColor: theme === "dark" ? "#0a0a0a" : "white",
      },
      borderRadius: "6px",
      minHeight: "48px",
    };
  },
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    let color: Color;
    try {
      color = chroma(data.color);
    } catch (e) {
      //handle notion undentified colors
      console.error({ e, color: data.color });
      color = chroma("#D1D5E6");
    }
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
        ? data.color
        : isFocused
        ? color.alpha(0.6).darken(0.6).css()
        : color.darken(0.8).alpha(0.7).css(),
      color: chroma.contrast(color, "white") > 2 ? "white" : (theme === "dark" ? "#111827" : "black"),
      margin: "2px 0px",
      borderRadius: "2px",
      padding: "10px 25px",

      cursor: isDisabled ? "not-allowed" : "pointer",

      ":active": {
        ...styles[":active"],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.8).css()
          : undefined,
      },
    };
  },
  multiValue: (styles, { data }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: color.darken(0.6).alpha(0.7).css(),
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: chroma.contrast(data.color, "white") > 2 ? "white" : (theme === "dark" ? "#111827" : "black"),
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: chroma.contrast(data.color, "white") > 2 ? "white" : (theme === "dark" ? "#111827" : "black"),
    ":hover": {
      backgroundColor: data.color,
      color: "white",
    },
  }),
  menu: (styles) => ({
    ...styles,
    width: "100%",
    boxShadow: `0px 2px 24px ${theme === "dark" ? "#111827" : "#DAE6EF"}`,
    zIndex: 99999, //fix so that it can overlap over other components
  }),
  menuList: (styles) => ({
    ...styles,
    borderRadius: "6px",
    backgroundColor: theme === "dark" ? "#0a0a0a" : "white",
  }),
  menuPortal: (base) => {
    const { ...rest } = base;
    return { ...rest, zIndex: 9999 };
  },
  indicatorSeparator: (styles) => ({ ...styles, display: "none" }),
  placeholder: (styles) => ({
    ...styles,
    color: theme === "dark" ? "#9ca3af" : "#6b7280",
  }),
  input: (styles) => ({
    ...styles,
    color: theme === "dark" ? "#f9fafb" : "#111827",
  }),
  singleValue: (styles) => ({
    ...styles,
    color: theme === "dark" ? "#f9fafb" : "#111827",
  }),
});

interface Props {
  options: ColourOption[];
  disabled?: boolean;
  handleSelect: (e: any) => void;
  selectedOptions?: ColourOption[];
  theme?: "light" | "dark";
  width?: number | string;
}

export default function MultiSelect({
  options,
  disabled = false,
  handleSelect,
  selectedOptions,
  theme = "light",
  width,
}: Props) {
  return (
    <Select
      closeMenuOnSelect={false}
      isMulti
      options={options}
      value={selectedOptions}
      styles={colourStyles(theme, width)}
      isDisabled={disabled}
      id="notion-tags-select"
      instanceId="notion-tags-select"
      isClearable={true}
      placeholder="Select tags"
      onChange={(e: any) => {
        handleSelect(e);
      }}
    />
  );
}
