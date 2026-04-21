import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface SheetMeta {
  name: string;
  kind: string;
  entry_count: number;
  cache_key: string;
}

export interface DictionaryEntry {
  ja: string;
  en: string;
  source_file: string;
  source_sheet: string;
}

export interface SearchResult {
  exact: DictionaryEntry[];
  prefix: DictionaryEntry[];
  substring: DictionaryEntry[];
}

export interface FileInfo {
  name: string;
  path: string;
  base_sheets: SheetMeta[];
  table_sheets: SheetMeta[];
  entries_count: number;
  parse_duration_ms: number;
  enabled: boolean;
}

export interface LoadResult {
  total_entries: number;
  files: FileInfo[];
}

export interface ScanResult {
  files: FileInfo[];
}

export interface DictionaryStats {
  total_entries: number;
  active_sheets: number;
}

export function useDictionary() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [activeSheetsCount, setActiveSheetsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      const loadedFiles = await invoke<FileInfo[]>("list_loaded_files");
      setFiles(loadedFiles);
      
      const stats = await invoke<DictionaryStats>("get_dictionary_stats");
      setTotalEntries(stats.total_entries);
      setActiveSheetsCount(stats.active_sheets);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const scanExcelSheets = useCallback(async (paths: string[]): Promise<ScanResult> => {
    return await invoke<ScanResult>("scan_excel_sheets", { filePaths: paths });
  }, []);

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

  const loadFilesByPath = useCallback(async (paths: string[], selectedSheets: string[] = []) => {
    if (paths.length === 0) return;
    try {
      setIsLoading(true);
      const res = await invoke<LoadResult>("load_excel_files", { 
        filePaths: paths,
        selectedTableSheets: selectedSheets
      });
      setFiles(res.files);
      setTotalEntries(res.total_entries);
    } catch (err) {
      console.error("Failed to load files by path", err);
      alert("Failed to load Excel files: " + err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTableSelection = useCallback(async (selectedCacheKeys: string[]) => {
    try {
      setIsLoading(true);
      const res = await invoke<DictionaryStats>("update_table_selection", { selectedCacheKeys });
      setTotalEntries(res.total_entries);
      setActiveSheetsCount(res.active_sheets);
      await fetchFiles(); // Refresh file counts
    } catch (err) {
      console.error("Failed to update selection", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const getActiveSheets = useCallback(async (): Promise<string[]> => {
    return await invoke<string[]>("get_active_sheets");
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
      setActiveSheetsCount(0);
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
    activeSheetsCount,
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
    scanExcelSheets,
    updateTableSelection,
    getActiveSheets,
  };
}
