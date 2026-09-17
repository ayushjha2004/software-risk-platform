import { useState, useEffect, useCallback } from 'react';

export const SAVED_PROJECTS_STORAGE_KEY = 'bidforge_saved_projects';
export const SAVED_PROJECTS_EVENT = 'bidforge_saved_projects_updated';

/**
 * Retrieve saved project IDs from localStorage
 */
export function getSavedProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'string');
    }
    return [];
  } catch (err) {
    console.warn('Failed to parse saved projects from localStorage', err);
    return [];
  }
}

/**
 * Persist saved project IDs to localStorage and notify listeners
 */
export function saveProjectIds(ids: string[]): void {
  try {
    localStorage.setItem(SAVED_PROJECTS_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(
      new CustomEvent(SAVED_PROJECTS_EVENT, { detail: { savedIds: ids } })
    );
  } catch (err) {
    console.warn('Failed to write saved projects to localStorage', err);
  }
}

/**
 * Check if a project is currently saved
 */
export function isProjectSaved(projectId: string): boolean {
  return getSavedProjectIds().includes(projectId);
}

/**
 * Toggle bookmark state for a project ID
 */
export function toggleSavedProject(projectId: string): { isSaved: boolean; savedIds: string[] } {
  const current = getSavedProjectIds();
  const exists = current.includes(projectId);
  const updated = exists
    ? current.filter((id) => id !== projectId)
    : [...current, projectId];
  saveProjectIds(updated);
  return { isSaved: !exists, savedIds: updated };
}

/**
 * Custom React Hook to manage and synchronize saved/bookmarked projects across the UI
 */
export function useSavedProjects() {
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(() => getSavedProjectIds());

  useEffect(() => {
    const handleUpdate = () => {
      setSavedProjectIds(getSavedProjectIds());
    };

    window.addEventListener(SAVED_PROJECTS_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(SAVED_PROJECTS_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const toggle = useCallback((projectId: string) => {
    const result = toggleSavedProject(projectId);
    setSavedProjectIds(result.savedIds);
    return result.isSaved;
  }, []);

  const isSaved = useCallback(
    (projectId: string) => savedProjectIds.includes(projectId),
    [savedProjectIds]
  );

  return {
    savedProjectIds,
    isSaved,
    toggle,
    savedCount: savedProjectIds.length,
  };
}
