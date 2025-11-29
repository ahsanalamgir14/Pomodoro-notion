import { Result } from "../../types/database/databaseQuery";

export const getProjectTitle = (
  project: Result | undefined,
  defaultText = "Empty"
): string => {
  if (!project?.properties) return defaultText;
  const entries = Object.entries(project.properties as any);
  const titleEntry = entries.find(([, p]: any) => p?.type === "title");
  const titleArr = titleEntry ? ((titleEntry[1] as any)?.title || []) : [];
  if (Array.isArray(titleArr) && titleArr.length > 0) {
    return titleArr.map((t: any) => t?.plain_text || t?.text?.content || "").join("").trim() || defaultText;
  }
  return defaultText;
};
export const getProjectId = (project: Result): string => {
  return project.id;
};

export const getProjectTitleSafe = (
  project: Result | undefined,
  defaultText = "Empty"
): string => {
  if (!project?.properties) return defaultText;
  const nameTitle = (project as any)?.properties?.Name?.title || [];
  if (Array.isArray(nameTitle) && nameTitle.length > 0) {
    const text = nameTitle.map((t: any) => t?.plain_text || t?.text?.content || "").join("").trim();
    if (text) return text;
  }
  const entries = Object.entries(project.properties as any);
  const titleEntry = entries.find(([, p]: any) => p?.type === "title");
  const titleArr = titleEntry ? ((titleEntry[1] as any)?.title || []) : [];
  if (Array.isArray(titleArr) && titleArr.length > 0) {
    const text = titleArr.map((t: any) => t?.plain_text || t?.text?.content || "").join("").trim();
    if (text) return text;
  }
  return defaultText;
};
