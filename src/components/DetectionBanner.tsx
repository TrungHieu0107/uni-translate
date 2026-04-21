import React, { useState } from 'react';
import { Search, CheckCircle, AlertCircle, X, CheckSquare, Square, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { DetectionResult, DetectionMethod } from '../lib/tableNameDetector';

interface DetectionBannerProps {
  result: DetectionResult;
  pendingChecked: Set<string>;
  onToggle: (tableName: string) => void;
  onApplyAndTranslate: () => void;
  onTranslateOnly: () => void;
  onDismiss: () => void;
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
}) => {
  const [showAlreadySelected, setShowAlreadySelected] = useState(false);
  
  const newTables = result.matched.filter(t => !t.alreadySelected);
  const alreadySelected = result.matched.filter(t => t.alreadySelected);
  
  if (newTables.length === 0 && result.unmatched.length === 0 && alreadySelected.length === 0) return null;

  return (
    <div className="mx-4 my-2 p-4 bg-drac-bg-tertiary/50 border border-drac-accent/30 rounded-lg shadow-xl animate-slide-up backdrop-blur-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-drac-accent font-bold">
          <Search size={18} className="animate-pulse" />
          <span className="tracking-tight">Tables detected in your text</span>
        </div>
        <button onClick={onDismiss} className="text-drac-text-secondary hover:text-drac-text-primary transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* NEW TABLES */}
        {newTables.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-drac-accent uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-drac-accent rounded-full" />
              New - will be added to selection
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {newTables.map((t) => (
                <div 
                  key={t.tableName}
                  className={`flex items-center gap-3 p-2 rounded-md border transition-all cursor-pointer group ${
                    pendingChecked.has(t.tableName) 
                      ? "bg-drac-accent/10 border-drac-accent/40" 
                      : "bg-drac-bg-secondary/40 border-drac-border hover:border-drac-text-secondary"
                  }`}
                  onClick={() => onToggle(t.tableName)}
                >
                  <div className={pendingChecked.has(t.tableName) ? "text-drac-accent" : "text-drac-text-secondary"}>
                    {pendingChecked.has(t.tableName) ? <CheckSquare size={16} /> : <Square size={16} />}
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

        {/* ALREADY SELECTED */}
        {alreadySelected.length > 0 && (
          <div className="space-y-2">
            <button 
              onClick={() => setShowAlreadySelected(!showAlreadySelected)}
              className="text-[10px] font-bold text-drac-success uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <CheckCircle size={12} />
              Already in selection ({alreadySelected.length})
              {showAlreadySelected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showAlreadySelected && (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {alreadySelected.map(t => (
                  <span key={t.tableName} className="text-xs px-2 py-1 bg-drac-success/10 text-drac-success border border-drac-success/20 rounded-md">
                    {t.tableName}
                  </span>
                ))}
              </div>
            )}
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

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button 
            onClick={onApplyAndTranslate}
            className="flex items-center gap-2 px-4 py-2 bg-drac-accent text-drac-bg-primary font-bold rounded-md hover:bg-drac-accent-hover transition-all shadow-lg shadow-drac-accent/20"
          >
            <Zap size={16} />
            Apply & Translate
          </button>
          <button 
            onClick={onTranslateOnly}
            className="px-4 py-2 bg-drac-bg-tertiary text-drac-text-primary border border-drac-border rounded-md hover:bg-drac-bg-secondary transition-all"
          >
            Translate Without Applying
          </button>
        </div>
      </div>
    </div>
  );
};
