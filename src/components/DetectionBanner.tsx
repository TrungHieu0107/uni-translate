import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertCircle, X, CheckSquare, Square, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { DetectionResult, DetectionMethod } from '../lib/tableNameDetector';

interface DetectionBannerProps {
  result: DetectionResult;
  pendingChecked: Set<string>;
  onToggle: (tableName: string) => void;
  onApplyAndTranslate: () => void;
  onTranslateOnly: () => void;
  onDismiss: () => void;
  isApplied?: boolean;
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
  pendingChecked,
  onToggle,
  onApplyAndTranslate,
  onTranslateOnly,
  onDismiss,
  isApplied = false,
}) => {
  const [showAlreadySelected, setShowAlreadySelected] = useState(false);
  const [isMainCollapsed, setIsMainCollapsed] = useState(isApplied);
  
  // Sync collapse state with isApplied when it changes to true
  useEffect(() => {
    if (isApplied) setIsMainCollapsed(true);
  }, [isApplied]);

  const newTables = result.matched.filter(t => !t.alreadySelected);
  const alreadySelected = result.matched.filter(t => t.alreadySelected);
  
  if (newTables.length === 0 && result.unmatched.length === 0 && alreadySelected.length === 0) return null;

  return (
    <div className={`mx-4 my-2 p-4 border rounded-lg shadow-xl animate-slide-up backdrop-blur-md transition-all duration-300 ${
      isApplied 
        ? "bg-drac-success/10 border-drac-success/30 py-2" 
        : "bg-drac-bg-tertiary/50 border-drac-accent/30"
    }`}>
      <div className="flex items-center justify-between">
        <div 
          className={`flex items-center gap-2 font-bold cursor-pointer hover:opacity-80 transition-opacity ${
            isApplied ? "text-drac-success" : "text-drac-accent"
          }`}
          onClick={() => setIsMainCollapsed(!isMainCollapsed)}
        >
          {isApplied ? <CheckCircle size={18} /> : <Search size={18} className="animate-pulse" />}
          <span className="tracking-tight">
            {isApplied ? "Applied table selection" : "Tables detected in your text"}
          </span>
          {isMainCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          {isMainCollapsed && !isApplied && (
            <span className="text-[10px] bg-drac-accent/20 px-2 py-0.5 rounded-full ml-2">
              {newTables.length + alreadySelected.length} found
            </span>
          )}
        </div>
        <button onClick={onDismiss} className="text-drac-text-secondary hover:text-drac-text-primary transition-colors">
          <X size={18} />
        </button>
      </div>

      {!isMainCollapsed && (
        <div className="space-y-4 mt-4 animate-fade-in">
        {/* NEW TABLES */}
        {newTables.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-drac-success uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-drac-success rounded-full" />
              Automatically loaded from your text
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {newTables.map((t) => (
                <div 
                  key={t.tableName}
                  className="flex items-center gap-3 p-2 rounded-md border bg-drac-success/5 border-drac-success/20 group"
                >
                  <div className="text-drac-success">
                    <CheckSquare size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-drac-text-primary truncate">{t.tableName}</span>
                      <MethodBadge method={result.detectionMethod[t.tableName]} />
                    </div>
                    <div className="text-[10px] text-drac-text-secondary opacity-60">
                      {t.entryCount} entries
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UNMATCHED TABLES */}
        {result.unmatched.length > 0 && (
          <div className="p-3 bg-drac-warning/10 border border-drac-warning/20 rounded-md space-y-1.5">
            <div className="text-[10px] font-bold text-drac-warning uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} />
              Not found in loaded sheets
            </div>
            <div className="text-xs text-drac-warning/80 flex flex-wrap gap-x-2">
              {result.unmatched.map((name, i) => (
                <span key={name}>{name}{i < result.unmatched.length - 1 ? "," : ""}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
