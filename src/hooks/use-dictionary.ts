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

export interface FileError {
  path: string;
  error: string;
}

export interface LoadResult {
  total_entries: number;
  files: FileInfo[];
  errors: FileError[];
}

export interface ScanResult {
  files: FileInfo[];
  errors: FileError[];
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
  const [error, setError] = useState<string | null>(null);
  
  const clearError = useCallback(() => setError(null), []);

  const fetchFiles = useCallback(async () => {
    try {
      const loadedFiles = await invoke<FileInfo[]>("list_loaded_files");
      setFiles(loadedFiles);
      
      const stats = await invoke<DictionaryStats>("get_dictionary_stats");
      setTotalEntries(stats.total_entries);
      setActiveSheetsCount(stats.active_sheets);
    } catch (err: any) {
      console.error("Failed to fetch files", err);
      setError(err.toString());
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
    } catch (err: any) {
      console.error("Failed to open dialog", err);
      setError(err.toString());
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
    } catch (err: any) {
      console.error("Failed to update selection", err);
      setError(err.toString());
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
    } catch (err: any) {
      console.error("Failed to remove file", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const toggleFileEnabled = useCallback(async (path: string, enabled: boolean) => {
    try {
      setIsLoading(true);
      await invoke("toggle_file_enabled", { filePath: path, enabled });
      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to toggle file", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, [fetchFiles]);

  const toggleAllFiles = useCallback(async (enabled: boolean) => {
    try {
      setIsLoading(true);
      await invoke("toggle_all_files", { enabled });
      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to toggle all files", err);
      setError(err.toString());
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
    } catch (err: any) {
      console.error("Failed to reset dictionary", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadFiles = useCallback(async () => {
    if (files.length === 0) return;
    try {
      setIsLoading(true);
      setError(null);
      const paths = files.map(f => f.path);
      const res = await invoke<LoadResult>("reload_files", { filePaths: paths });
      setFiles(res.files);
      setTotalEntries(res.total_entries);

      if (res.errors.length > 0) {
        const allFailed = res.errors.length === paths.length;
        const failedNames = res.errors
          .map(e => e.path.split(/[\\/]/).pop() ?? e.path)
          .join(", ");
        setError(
          allFailed
            ? `Reload thất bại: ${failedNames}`
            : `Reload thành công một phần. Lỗi: ${failedNames}`
        );
      }
    } catch (err: any) {
      console.error("reload_files command failed", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, [files]);

  const reloadFile = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await invoke<LoadResult>("reload_files", { filePaths: [path] });
      setFiles(res.files);
      setTotalEntries(res.total_entries);

      if (res.errors.length > 0) {
        setError(`Không thể reload: ${res.errors[0].error}`);
      }
    } catch (err: any) {
      console.error("reload_files command failed", err);
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (keyword: string): Promise<SearchResult | null> => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return null;
    try {
      return await invoke<SearchResult>("search", { keyword: trimmedKeyword });
    } catch (err: any) {
      console.error("Search failed", err);
      setError(err.toString());
      return { exact: [], prefix: [], substring: [] };
    }
  }, []);

  return {
    files,
    totalEntries,
    activeSheetsCount,
    isLoading,
    error,
    clearError,
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
