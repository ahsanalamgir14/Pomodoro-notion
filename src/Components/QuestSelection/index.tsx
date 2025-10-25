import dynamic from "next/dynamic";
import React, { useCallback } from "react";
import PlaceHolderLoader from "../PlaceHolderLoader";

const AsyncSelect = dynamic(() => import("react-select/async"), {
  loading: () => <PlaceHolderLoader />,
  ssr: false,
});

type Option = { label: string; value: string };

type Props = {
  disabled?: boolean;
  projectId?: string | null;
  relationName?: string;
  values: Option[];
  onChange: (opts: Option[]) => void;
};

const colourStyles = ({
  backgroundColor = "white",
  margin = "unset",
  padding = "12px 16px 12px, 16px",
  border = `1px solid #DAE6EF`,
  borderRadius = "6px",
  minWidth = "310px",
  controlFontWeight = 400,
  whiteBackground = "white",
  minHeight = "48px",
}) => {
  return {
    menuPortal: (base: any) => {
      const { ...rest } = base;
      return { ...rest, zIndex: 9999 };
    },
    control: (styles: any) => {
      return {
        ...styles,
        fontWeight: controlFontWeight,
        width: "100%",
        boxShadow: "unset",
        cursor: "pointer",
        margin,
        padding,
        backgroundColor,
        border: border,
        
        "&:hover": {
          fontWeight: 0,
          backgroundColor: whiteBackground,
        },
        borderRadius,
        minHeight,
      };
    },
    menu: (styles: any) => ({
      ...styles,
      width: "100%",
      boxShadow: `0px 2px 24px #DAE6EF`,
      zIndex: 99999,
    }),
    dropdownIndicator: (style: any) => ({
      ...style,
    }),
    menuList: (styles: any) => ({
      ...styles,
      padding: "0px",
      borderRadius,
    }),
    indicatorSeparator: (styles: any) => ({ ...styles, display: "none" }),
  };
};

export default function QuestSelection({ disabled = false, projectId, relationName = "Quests", values, onChange }: Props) {
  const loadOptions = useCallback(async (): Promise<Option[]> => {
    if (!projectId) return [];
    try {
      const qs = new URLSearchParams({ userId: "notion-user", pageId: projectId, relationName });
      const resp = await fetch(`/api/notion/page-relations?${qs.toString()}`);
      if (!resp.ok) return [];
      const data = await resp.json();
      const items = (data?.items || []) as Array<{ id: string; title: string }>
      return items.map(i => ({ label: i.title, value: i.id }));
    } catch (e) {
      return [];
    }
  }, [projectId, relationName]);

  return (
    <AsyncSelect
      cacheOptions
      defaultOptions
      isDisabled={disabled || !projectId}
      value={values}
      isMulti
      loadOptions={loadOptions}
      onChange={(opts: any) => onChange(opts || [])}
      placeholder="Select Quest(s) (relation)"
      styles={colourStyles({})}
      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
      instanceId="quest-select"
      inputId="quest-select"
      isClearable
      closeMenuOnSelect={false}
    />
  );
}
