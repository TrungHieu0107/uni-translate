import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertCircle, X, CheckSquare, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { DetectionResult, DetectionMethod } from '../lib/table-name-detector';

interface DetectionBannerProps {
  result: DetectionResult;
  onDismiss: () => void;
  isApplied?: boolean;
  onToggleExclusion?: (tableName: string) => void;
  excludedTables?: Set<string>;
}

const MethodBadge = ({ method }: { method: DetectionMethod }) => (
  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
    method === "sql-keyword" 
      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
      : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
  }`}>
    {method === "sql-keyword" ? "SQL" : "Token"}
  </span>
);

export const DetectionBanner: React.FC<DetectionBannerProps> = ({
  result,
  onDismiss,
  isApplied = false,
  onToggleExclusion,
  excludedTables = new Set(),
}) => {
  const [isMainCollapsed, setIsMainCollapsed] = useState(isApplied);
  
  // Sync collapse state with isApplied when it changes to true
  useEffect(() => {
    if (isApplied) setIsMainCollapsed(true);
  }, [isApplied]);

  // If isApplied is true, we want to show all matched tables as "Applied"
  const matchedTables = result.matched;
  const unmatchedTables = result.unmatched;
  
  if (matchedTables.length === 0 && unmatchedTables.length === 0) return null;

  return (
    <div className={`mx-4 my-2 p-4 border rounded-xl shadow-2xl animate-slide-up backdrop-blur-md transition-all duration-500 ${
      isApplied 
        ? "bg-drac-success/5 border-drac-success/20 py-3" 
        : "bg-drac-bg-tertiary/60 border-drac-accent/30"
    }`}>
      <div className="flex items-center justify-between">
        <div 
          className={`flex items-center gap-3 font-black cursor-pointer hover:opacity-80 transition-all active:scale-95 ${
            isApplied ? "text-drac-success" : "text-drac-accent"
          }`}
          onClick={() => setIsMainCollapsed(!isMainCollapsed)}
        >
          <div className={`p-1.5 rounded-lg ${isApplied ? "bg-drac-success/20" : "bg-drac-accent/20"}`}>
            {isApplied ? <CheckCircle size={16} /> : <Search size={16} className="animate-pulse" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.2em]">
              {isApplied ? "Applied table selection" : "Tables detected in your text"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono opacity-60">
                {matchedTables.filter(t => !excludedTables.has(t.tableName)).length} active sheets
              </span>
              {isMainCollapsed ? <ChevronDown size={12} className="opacity-40" /> : <ChevronUp size={12} className="opacity-40" />}
            </div>
          </div>
        </div>
        <button onClick={onDismiss} className="p-2 text-drac-text-secondary hover:text-drac-danger hover:bg-drac-danger/10 rounded-lg transition-all">
          <X size={18} />
        </button>
      </div>

      {!isMainCollapsed && (
        <div className="space-y-6 mt-6 animate-fade-in">
          {/* MATCHED TABLES */}
          {matchedTables.length > 0 && (
            <div className="space-y-3">
              <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-70`}>
                <Database size={12} />
                {isApplied ? "DYNAMIC CONTEXT" : "AUTO-DETECTED LAYERS"}
              </div>
              <div className="flex flex-wrap gap-2">
                {matchedTables.map((t) => {
                  const isExcluded = excludedTables.has(t.tableName);
                  return (
                    <div 
                      key={t.tableName}
                      className={`group flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg border transition-all duration-300 ${
                        isExcluded
                          ? "bg-drac-bg-secondary border-drac-border opacity-40 grayscale"
                          : isApplied 
                            ? "bg-drac-success/10 border-drac-success/30 hover:border-drac-success shadow-[0_2px_10px_rgba(80,250,123,0.05)]" 
                            : "bg-drac-bg-primary/50 border-drac-border hover:border-drac-accent/50"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isExcluded ? 'line-through text-drac-text-secondary' : 'text-drac-text-primary'}`}>
                            {t.tableName}
                          </span>
                          {!isApplied && !isExcluded && <MethodBadge method={result.detectionMethod[t.tableName]} />}
                        </div>
                        <span className="text-[9px] font-mono text-drac-text-secondary/50">
                          {t.entryCount.toLocaleString()} entries
                        </span>
                      </div>
                      
                      {onToggleExclusion && (
                        <button 
                          onClick={() => onToggleExclusion(t.tableName)}
                          className={`ml-1 p-1 rounded-md transition-all ${
                            isExcluded 
                              ? "text-drac-accent hover:bg-drac-accent/20" 
                              : "text-drac-text-secondary hover:text-drac-danger hover:bg-drac-danger/20"
                          }`}
                          title={isExcluded ? "Re-enable table" : "Deselect table"}
                        >
                          {isExcluded ? <CheckSquare size={14} /> : <X size={14} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* UNMATCHED TABLES */}
          {unmatchedTables.length > 0 && (
            <div className="p-4 bg-drac-warning/5 border border-drac-warning/10 rounded-xl space-y-2">
              <div className="text-[10px] font-black text-drac-warning/70 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={12} />
                MISSING DICTIONARY LAYERS
              </div>
              <div className="text-[11px] text-drac-warning/60 font-mono flex flex-wrap gap-x-3">
                {unmatchedTables.map((name, i) => (
                  <span key={name}>{name}{i < unmatchedTables.length - 1 ? "," : ""}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
