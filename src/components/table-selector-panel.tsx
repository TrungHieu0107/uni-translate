import { useState, useMemo, useCallback } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Table, 
  Database,
  CheckSquare,
  Square,
  MinusSquare,
  Zap,
  Info,
  RotateCw
} from "lucide-react";
import HighlightedText from './highlighted-text';
import { SheetMeta, ScanResult } from "../hooks/use-dictionary";

interface TableSelectorPanelProps {
  scanResult: ScanResult | null;
  selectedSheets: string[];
  onToggleSheet: (cacheKey: string) => void;
  onToggleAll: (keys: string[], select: boolean) => void;
  onRefresh: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isApplying: boolean;
}

export function TableSelectorPanel({
  scanResult,
  selectedSheets,
  onToggleSheet,
  onToggleAll,
  onRefresh,
  isCollapsed,
  onToggleCollapse,
  isApplying
}: TableSelectorPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const tableSheets = useMemo(() => {
    if (!scanResult) return [];
    const all: { fileName: string; sheet: SheetMeta; key: string }[] = [];
    scanResult.files.forEach(file => {
      // Only show Table sheets. Base (System) sheets are auto-loaded.
      file.table_sheets.forEach(sheet => {
        all.push({ 
          fileName: file.name,
          sheet, 
          key: sheet.cache_key 
        });
      });
    });
    return all;
  }, [scanResult]);

  const filteredTables = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return tableSheets;
    return tableSheets.filter(t => 
      t.sheet.name.toLowerCase().includes(query) || 
      t.fileName.toLowerCase().includes(query)
    );
  }, [tableSheets, searchQuery]);

  const visibleKeys = useMemo(() => filteredTables.map(t => t.key), [filteredTables]);
  
  const selectedSheetsSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);

  const selectedVisibleCount = useMemo(() => 
    visibleKeys.filter(k => selectedSheetsSet.has(k)).length, 
    [visibleKeys, selectedSheetsSet]
  );

  const checkboxState = useMemo(() => {
    if (visibleKeys.length === 0) return "unchecked";
    if (selectedVisibleCount === visibleKeys.length) return "checked";
    if (selectedVisibleCount > 0) return "indeterminate";
    return "unchecked";
  }, [visibleKeys, selectedVisibleCount]);



  const handleToggleAllClick = useCallback(() => {
    if (checkboxState === "checked") {
      onToggleAll(visibleKeys, false);
    } else {
      onToggleAll(visibleKeys, true);
    }
  }, [checkboxState, visibleKeys, onToggleAll]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-drac-bg-secondary border-l border-drac-border flex flex-col items-center py-4 gap-4 transition-all duration-300 shrink-0">
        <button 
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-drac-bg-tertiary text-drac-accent transition-colors relative"
          title="Expand Table Selector"
        >
          <ChevronLeft size={20} />
          {isApplying && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-drac-accent rounded-full animate-ping" />
          )}
        </button>
        <div className="h-px w-6 bg-drac-border" />
        <Table size={20} className={isApplying ? "text-drac-accent animate-pulse" : "text-drac-text-secondary"} />
        <div className="flex-1 flex flex-col items-center justify-end pb-8">
            <div className="vertical-text text-[10px] font-bold tracking-widest text-drac-text-secondary opacity-50 select-none">
                TABLE SELECTOR
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-drac-bg-secondary border-l border-drac-border flex flex-col shadow-[-2px_0_10px_rgba(0,0,0,0.2)] transition-all duration-300 animate-slide-left overflow-hidden relative shrink-0">
      <div className="p-4 border-b border-drac-border flex items-center justify-between bg-drac-bg-tertiary/30">
        <div className="flex items-center gap-2 font-bold text-drac-accent">
          <Table size={18} />
          <span>Table Selector</span>
          {isApplying && (
            <RotateCw size={14} className="animate-spin ml-1 opacity-70" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onRefresh}
            className="p-1.5 rounded-md hover:bg-drac-bg-tertiary text-drac-accent transition-colors disabled:opacity-50"
            title="Reload table list from disk"
            disabled={isApplying}
          >
            <RotateCw size={16} className={isApplying ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-drac-bg-tertiary text-drac-text-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-drac-border bg-drac-bg-secondary/50">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-drac-text-secondary group-focus-within:text-drac-accent transition-colors" />
          <input 
            type="text"
            placeholder="Search tables..."
            className="w-full pl-9 pr-4 py-2 bg-drac-bg-primary border border-drac-border rounded-md text-sm focus:outline-none focus:border-drac-accent transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 py-2 border-b border-drac-border flex items-center justify-between text-xs bg-drac-bg-tertiary/20">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-drac-text-primary transition-colors text-drac-text-secondary py-1"
          onClick={handleToggleAllClick}
        >
          {checkboxState === "checked" ? <CheckSquare size={14} className="text-drac-accent" /> : 
           checkboxState === "indeterminate" ? <MinusSquare size={14} className="text-drac-accent" /> : 
           <Square size={14} />}
          <span className="font-medium">
            {checkboxState === "checked" ? "Deselect All" : "Select All"} ({selectedVisibleCount}/{visibleKeys.length})
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {isApplying && (
          <div className="absolute inset-0 bg-drac-bg-secondary/20 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in pointer-events-none">
             <div className="flex flex-col items-center gap-3 bg-drac-bg-primary/70 p-6 rounded-2xl border border-drac-accent/30 shadow-2xl backdrop-blur-xl">
                <div className="relative">
                  <RotateCw size={24} className="animate-spin text-drac-accent" />
                  <div className="absolute inset-0 bg-drac-accent/20 blur-lg animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-black text-drac-accent tracking-[0.4em] animate-pulse">SYNCHRONIZING</span>
                  <span className="text-[8px] font-bold text-drac-text-secondary/50 tracking-widest">Applying Registry Updates</span>
                </div>
             </div>
          </div>
        )}
        
        {/* Table Sheets */}
        <div className="flex flex-col gap-1.5">
          <div className="px-2 text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary flex items-center gap-1.5 mb-1">
             <Database size={10} /> Table Sheets
          </div>
          
          {filteredTables.length === 0 ? (
            <div className="py-8 text-center text-xs text-drac-text-secondary italic">
              {searchQuery ? "No matching tables found" : "No table sheets available"}
            </div>
          ) : (
            filteredTables.map((item) => {
              const isChecked = selectedSheets.includes(item.key);
              return (
                <div 
                  key={item.key} 
                  className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isChecked 
                      ? 'bg-drac-accent/10 border-drac-accent/40 shadow-sm' 
                      : 'bg-drac-bg-primary border-drac-border hover:border-drac-text-secondary'
                  }`}
                  onClick={() => onToggleSheet(item.key)}
                >
                  <div className={`shrink-0 transition-colors ${isChecked ? 'text-drac-accent' : 'text-drac-text-secondary'}`}>
                    {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold truncate ${isChecked ? 'text-drac-text-primary' : 'text-drac-text-secondary'}`}>
                            {searchQuery ? (
                                <HighlightedText text={item.sheet.name} query={searchQuery} />
                            ) : item.sheet.name}
                        </span>
                        {item.sheet.kind === "Base" && (
                            <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30 uppercase tracking-tighter">
                                System
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-drac-text-secondary truncate">{item.fileName}</span>
                  </div>
                  <div className="text-[10px] font-mono text-drac-text-secondary shrink-0">
                    {item.sheet.entry_count.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer / Status */}
      <div className="p-4 border-t border-drac-border bg-drac-bg-tertiary/30 flex flex-col gap-3 min-h-[80px] justify-center">
        {selectedSheets.length === 0 && tableSheets.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-drac-warning/10 text-drac-warning text-[10px] leading-tight animate-fade-in">
             <Info size={14} className="shrink-0" />
             <span>Select sheets to activate them. System (Base) sheets are now optional.</span>
          </div>
        )}
        
        {isApplying ? (
          <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-lg bg-drac-accent/10 border border-drac-accent/30 text-drac-accent animate-pulse">
            <Zap size={16} className="animate-bounce" />
            <span className="text-xs font-bold tracking-widest uppercase">Auto-Applying Changes...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-drac-text-secondary opacity-50 select-none">
            <div className="w-1.5 h-1.5 rounded-full bg-drac-success animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Live Sync Active</span>
          </div>
        )}
      </div>

      <style>{`
        .vertical-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
        }
      `}</style>
    </div>
  );
}

