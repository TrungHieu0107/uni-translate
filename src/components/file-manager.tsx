import { useState } from "react";
import { Upload, X, FileSpreadsheet, Trash2, Link, Database, CheckSquare, Square, MinusSquare, RotateCw } from "lucide-react";
import { FileInfo } from "../hooks/use-dictionary";
import { FileItemSkeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

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
  onReloadFile?: (path: string) => void;
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
  onReload,
  onReloadFile
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

  const enabledCount = files.filter(f => f.enabled).length;
  const isAllEnabled = files.length > 0 && enabledCount === files.length;
  const isNoneEnabled = enabledCount === 0;
  const isIndeterminate = enabledCount > 0 && enabledCount < files.length;

  const handleToggleAll = () => {
    if (!onToggleAllFiles || files.length === 0) return;
    onToggleAllFiles(!isAllEnabled);
  };

  return (
    <aside className="w-[320px] flex-shrink-0 bg-drac-bg-secondary border-r border-drac-border flex flex-col z-10 shadow-2xl relative animate-fade-in">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-drac-border bg-drac-bg-tertiary/20">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-drac-accent/10 flex items-center justify-center border border-drac-accent/20">
            <Database size={22} className="text-drac-accent" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-drac-text-primary tracking-tight leading-none">CORE INDEX</h2>
            <span className="text-[10px] font-black text-drac-text-secondary uppercase tracking-[0.2em] mt-1 opacity-60">Dictionary Management</span>
          </div>
        </div>
      </div>

      {/* Load Section */}
      <div className="p-5 border-b border-drac-border flex flex-col gap-4 bg-drac-bg-primary/20">
        <Button 
          variant="accent" 
          className="w-full h-11 text-xs font-black tracking-widest"
          onClick={onLoadFiles} 
          disabled={isLoading}
          isLoading={isLoading}
          leftIcon={!isLoading && <Upload size={16} />}
        >
          LOAD VIA DIALOG
        </Button>

        <div className="flex gap-2 group">
          <input 
            type="text" 
            className="flex-1 h-9 px-3 rounded-lg border border-drac-border bg-drac-bg-primary text-drac-text-primary text-xs font-medium placeholder:text-drac-text-secondary/30 focus:outline-none focus:border-drac-accent/50 focus:ring-1 focus:ring-drac-accent/30 transition-all disabled:opacity-50"
            placeholder="Or absolute path..."
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLoadPath(); }}
            disabled={isLoading}
          />
          <Button 
            variant="ghost"
            className="w-9 h-9 p-0 border border-drac-border hover:border-drac-accent"
            onClick={handleLoadPath}
            disabled={isLoading || !pathInput.trim()}
          >
            <Link size={14} />
          </Button>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 flex flex-col p-5 overflow-y-auto scrollbar-dracula min-h-0">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button 
                className={`transition-all hover:scale-110 active:scale-95 ${isNoneEnabled ? 'text-drac-text-secondary opacity-40' : 'text-drac-accent'}`}
                onClick={handleToggleAll}
                disabled={isLoading}
              >
                {isAllEnabled ? <CheckSquare size={18} /> : 
                 isIndeterminate ? <MinusSquare size={18} /> : 
                 <Square size={18} />}
              </button>
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-drac-text-secondary/70">Data Sources</span>
          </div>
          
          {files.length > 0 && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="xs"
                className="w-7 h-7 p-0 text-drac-accent hover:bg-drac-accent/10"
                onClick={onReload}
                disabled={isLoading}
              >
                <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
              </Button>
              <Button 
                variant="ghost" 
                size="xs"
                className="w-7 h-7 p-0 text-drac-danger hover:bg-drac-danger/10"
                onClick={onReset}
                disabled={isLoading}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2.5">
          {isLoading && files.length === 0 ? (
            <>
              <FileItemSkeleton />
              <FileItemSkeleton />
              <FileItemSkeleton />
            </>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center opacity-30">
              <FileSpreadsheet size={40} className="mb-4" />
              <p className="text-xs font-bold tracking-widest uppercase">No files loaded</p>
            </div>
          ) : (
            <>
              {files.map(f => (
              <div 
                key={f.path} 
                className={`group relative bg-drac-bg-primary rounded-xl p-3.5 flex items-center border transition-all duration-300 animate-fade-in
                  ${f.enabled 
                    ? 'border-drac-border hover:border-drac-accent/40 shadow-sm hover:shadow-drac-accent/10' 
                    : 'border-transparent opacity-40 grayscale blur-[0.2px]'
                  }`}
              >
                <button 
                  className={`flex-shrink-0 mr-3 transition-all hover:scale-110 active:scale-95 ${f.enabled ? 'text-drac-accent' : 'text-drac-text-secondary'}`}
                  onClick={() => onToggleFileEnabled?.(f.path, !f.enabled)}
                  disabled={isLoading}
                >
                  {f.enabled ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>

                <div className="flex-1 flex flex-col overflow-hidden gap-0.5">
                  <span className={`text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${f.enabled ? 'text-drac-text-primary group-hover:text-drac-accent' : 'text-drac-text-secondary'}`} title={f.name}>
                    {f.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-drac-text-secondary/60 font-bold">{f.entries_count.toLocaleString()} rows</span>
                    {f.enabled && <div className="w-1 h-1 rounded-full bg-drac-success animate-pulse" />}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0 scale-90 origin-right">
                  <Button 
                    variant="ghost" 
                    size="xs"
                    className="w-7 h-7 p-0 text-drac-accent hover:bg-drac-accent/10"
                    onClick={() => onReloadFile?.(f.path)}
                    disabled={isLoading}
                  >
                    <RotateCw size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="xs"
                    className="w-7 h-7 p-0 text-drac-danger hover:bg-drac-danger/10"
                    onClick={() => onRemoveFile(f.path)}
                    disabled={isLoading}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </div>
      
      {/* Sidebar Footer Stats */}
      {files.length > 0 && (
        <div className="p-4 bg-drac-bg-secondary border-t border-drac-border flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-drac-text-secondary/50">
            <span>Global Matrix Stats</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-drac-bg-primary/40 rounded-lg p-2 border border-drac-border/50">
              <span className="block text-[8px] font-black text-drac-text-secondary/40 uppercase mb-0.5">Files</span>
              <span className="text-xs font-mono font-bold text-drac-accent">{files.length}</span>
            </div>
            <div className="bg-drac-bg-primary/40 rounded-lg p-2 border border-drac-border/50">
              <span className="block text-[8px] font-black text-drac-text-secondary/40 uppercase mb-0.5">Active Rows</span>
              <span className="text-xs font-mono font-bold text-drac-success">
                {files.filter(f => f.enabled).reduce((acc, f) => acc + f.entries_count, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
