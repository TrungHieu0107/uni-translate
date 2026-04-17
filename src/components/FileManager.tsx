import { useState } from "react";
import { Upload, X, FileSpreadsheet, Trash2, Link, Database, CheckSquare, Square, MinusSquare, RotateCw } from "lucide-react";
import { FileInfo } from "../hooks/useDictionary";

interface FileManagerProps {
  files: FileInfo[];
  isLoading: boolean;
  onLoadFiles: () => void;
  onLoadFilesByPath?: (paths: string[]) => void;
  onRemoveFile: (path: string) => void;
  onToggleFileEnabled?: (path: string, enabled: boolean) => void;
  onToggleAllFiles?: (enabled: boolean) => void;
  onReset: () => void;
  onReload?: () => void;
}

export function FileManager({ 
  files, 
  isLoading, 
  onLoadFiles, 
  onLoadFilesByPath, 
  onRemoveFile, 
  onToggleFileEnabled, 
  onToggleAllFiles,
  onReset,
  onReload
}: FileManagerProps) {
  const [pathInput, setPathInput] = useState("");

  const handleLoadPath = () => {
    if (!pathInput.trim() || !onLoadFilesByPath) return;
    const paths = pathInput.split(/[\n,]+/).map(p => p.trim().replace(/^"|"$/g, '')).filter(Boolean);
    if (paths.length > 0) {
      onLoadFilesByPath(paths);
      setPathInput("");
    }
  };

  // Determine selection state
  const enabledCount = files.filter(f => f.enabled).length;
  const isAllEnabled = files.length > 0 && enabledCount === files.length;
  const isNoneEnabled = enabledCount === 0;
  const isIndeterminate = enabledCount > 0 && enabledCount < files.length;

  const handleToggleAll = () => {
    if (!onToggleAllFiles || files.length === 0) return;
    // If some or none are selected, select all. Otherwise deselect all.
    onToggleAllFiles(!isAllEnabled);
  };

  return (
    <div className="w-[300px] flex-shrink-0 bg-drac-bg-secondary border-r border-drac-border flex flex-col z-10 shadow-[2px_0_10px_rgba(0,0,0,0.2)] animate-slide-down">
      <div className="p-5 border-b border-drac-border flex flex-col gap-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-drac-accent">
          <Database size={20} />
          Col Translator
        </div>
        
        <div className="text-sm text-drac-text-secondary">
          Dictionary Management
        </div>

        <button 
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors bg-drac-accent text-drac-bg-secondary hover:bg-drac-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onLoadFiles} 
          disabled={isLoading}
        >
          <Upload size={16} />
          {isLoading ? "Loading..." : "Load via Dialog"}
        </button>

        <div className="flex gap-2 mt-1">
          <input 
            type="text" 
            className="flex-1 p-2 rounded-md border border-drac-border bg-drac-bg-primary text-drac-text-primary text-sm focus:outline-none focus:border-drac-accent transition-colors disabled:opacity-50"
            placeholder="Or absolute path..."
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLoadPath(); }}
            disabled={isLoading}
          />
          <button 
            className="p-2 rounded-md border border-drac-border text-drac-text-primary hover:bg-drac-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleLoadPath}
            disabled={isLoading || !pathInput.trim()}
            title="Load from absolute path"
          >
            <Link size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-dracula">
        <div className="text-xs uppercase tracking-wider font-semibold text-drac-text-secondary flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button 
                className={`transition-colors ${isNoneEnabled ? 'text-drac-text-secondary' : 'text-drac-accent'}`}
                onClick={handleToggleAll}
                disabled={isLoading}
                title={isAllEnabled ? "Deselect all" : "Select all"}
              >
                {isAllEnabled ? <CheckSquare size={16} /> : 
                 isIndeterminate ? <MinusSquare size={16} /> : 
                 <Square size={16} />}
              </button>
            )}
            <span>Data Sources</span>
          </div>
          
          {files.length > 0 && (
            <div className="flex items-center gap-1">
              <button 
                className="p-1 text-drac-accent hover:bg-drac-accent-bg rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onReload}
                title="Reload all files from disk"
                disabled={isLoading}
              >
                <div className={isLoading ? "animate-spin" : ""}>
                   <RotateCw size={14} />
                </div>
              </button>
              <button 
                className="p-1 text-drac-danger hover:bg-drac-danger-bg rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onReset}
                title="Clear all dictionaries"
                disabled={isLoading}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          {files.length === 0 ? (
            <div className="text-center py-8 px-4 text-drac-text-secondary">
              <FileSpreadsheet size={24} className="opacity-30 mx-auto mb-2" />
              <div className="text-sm">No files loaded</div>
            </div>
          ) : (
            files.map(f => (
              <div key={f.path} className={`bg-drac-bg-primary rounded-md p-3 flex items-center border transition-all animate-fade-in group ${f.enabled ? 'border-drac-border opacity-100' : 'border-transparent opacity-50 gray-scale blur-[0.3px]'}`}>
                <button 
                  className={`flex-shrink-0 mr-3 transition-colors ${f.enabled ? 'text-drac-accent' : 'text-drac-text-secondary'}`}
                  onClick={() => onToggleFileEnabled?.(f.path, !f.enabled)}
                  disabled={isLoading}
                  title={f.enabled ? "Deactivate this file" : "Activate this file"}
                >
                  {f.enabled ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>

                <div className="flex-1 flex flex-col overflow-hidden gap-0.5">
                  <span className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${f.enabled ? 'text-drac-text-primary' : 'text-drac-text-secondary'}`} title={f.name}>{f.name}</span>
                  <span className="text-xs text-drac-text-secondary">{f.entries_count.toLocaleString()} rows</span>
                </div>

                <button 
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-drac-text-primary hover:bg-drac-bg-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                  onClick={() => onRemoveFile(f.path)}
                  disabled={isLoading}
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
