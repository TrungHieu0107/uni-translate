import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface FileInfo {
  name: string;
  path: string;
  entries_count: number;
  enabled: boolean;
}

export interface DictionaryEntry {
  ja: string;
  en: string;
  source_file: string;
  source_path: string;
}

export interface SearchResult {
  exact: DictionaryEntry[];
  prefix: DictionaryEntry[];
  substring: DictionaryEntry[];
}

export interface LoadResult {
  total_entries: number;
  files: FileInfo[];
}

export function useDictionary() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      const loadedFiles = await invoke<FileInfo[]>("list_loaded_files");
      setFiles(loadedFiles);
      
      // Calculate total entries from enabled files only
      const activeTotal = loadedFiles
        .filter(f => f.enabled)
        .reduce((acc, f) => acc + f.entries_count, 0);
      setTotalEntries(activeTotal);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const loadFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Excel',
          extensions: ['xlsx']
        }]
      });

      if (!selected) return;
      
      const paths = Array.isArray(selected) ? selected : [selected];
      await loadFilesByPath(paths);
    } catch (err) {
      console.error("Failed to open dialog", err);
    }
  }, []);

  const loadFilesByPath = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    try {
      setIsLoading(true);
      const res = await invoke<LoadResult>("load_excel_files", { filePaths: paths });
      setFiles(res.files);
      setTotalEntries(res.total_entries);
    } catch (err) {
      console.error("Failed to load files by path", err);
      alert("Failed to load Excel files: " + err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeFile = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      await invoke("remove_file", { filePath: path });
      await fetchFiles();
    } catch (err) {
      console.error("Failed to remove file", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const toggleFileEnabled = useCallback(async (path: string, enabled: boolean) => {
    try {
      setIsLoading(true);
      await invoke("toggle_file_enabled", { filePath: path, enabled });
      await fetchFiles();
    } catch (err) {
      console.error("Failed to toggle file", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const toggleAllFiles = useCallback(async (enabled: boolean) => {
    try {
      setIsLoading(true);
      await invoke("toggle_all_files", { enabled });
      await fetchFiles();
    } catch (err) {
      console.error("Failed to toggle all files", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const resetDictionary = useCallback(async () => {
    try {
      setIsLoading(true);
      await invoke("reset_dictionary");
      setFiles([]);
      setTotalEntries(0);
    } catch (err) {
      console.error("Failed to reset dictionary", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadFiles = useCallback(async () => {
    if (files.length === 0) return;
    try {
      setIsLoading(true);
      const paths = files.map(f => f.path);
      const res = await invoke<LoadResult>("reload_files", { filePaths: paths });
      setFiles(res.files);
      setTotalEntries(res.total_entries);
    } catch (err) {
      console.error("Failed to reload files", err);
      alert("Failed to reload files: " + err);
    } finally {
      setIsLoading(false);
    }
  }, [files]);

  const reloadFile = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      const res = await invoke<LoadResult>("reload_files", { filePaths: [path] });
      setFiles(res.files);
      setTotalEntries(res.total_entries);
    } catch (err) {
      console.error("Failed to reload file", err);
      alert("Failed to reload file: " + err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (keyword: string): Promise<SearchResult | null> => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return null;
    try {
      return await invoke<SearchResult>("search", { keyword: trimmedKeyword });
    } catch (err) {
      console.error("Search failed", err);
      return null;
    }
  }, []);

  return {
    files,
    totalEntries,
    isLoading,
    loadFiles,
    loadFilesByPath,
    removeFile,
    toggleFileEnabled,
    toggleAllFiles,
    resetDictionary,
    reloadFiles,
    reloadFile,
    search,
  };
}
