import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, AlertCircle, Terminal, Database, Table, Filter, Settings, Code2, Brain } from "lucide-react";
import { PathResult, ColumnMapping } from "../lib/java-code-parser";
import { DictionaryEntry } from "../hooks/use-dictionary";
import { invoke } from "@tauri-apps/api/core";
import { SQLDeepAnalysis, SqlAnalysis } from "./sql-deep-analysis";
import { formatError } from "../lib/errors";

interface PathCardProps {
  path: PathResult;
  translations: Record<string, DictionaryEntry | null>;
}

export function PathCard({ path, translations }: PathCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const [copiedCols, setCopiedCols] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SqlAnalysis | null>(null);

  const handleDeepAnalysis = async () => {
    if (showDeepAnalysis) {
      setShowDeepAnalysis(false);
      return;
    }

    if (analysis) {
      setShowDeepAnalysis(true);
      return;
    }

    try {
      setIsAnalyzing(true);
      const res = await invoke<SqlAnalysis>("analyze_sql", { query: path.fullSql });
      setAnalysis(res);
      setShowDeepAnalysis(true);
    } catch (err) {
      const { message, code } = formatError(err);
      console.error(`[${code}] Deep analysis failed:`, message);
      // In a real app, we might use a toast here
      alert(`Deep analysis failed: ${message} (Code: ${code})`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const conditionStr = Object.entries(path.conditions)
    .map(([k, v]) => `${k}=${v ? "✓" : "✗"}`)
    .join(", ");

  const setCols = path.columns.filter(c => c.category === "SET" || c.category === "VALUES");
  const whereCols = path.columns.filter(c => c.category === "WHERE");
  const joinOnCols = path.columns.filter(c => c.category === "JOIN_ON");

  return (
    <div className="bg-drac-bg-secondary border border-drac-border rounded-xl shadow-lg overflow-hidden animate-slide-up flex flex-col min-h-0">
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-drac-bg-tertiary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary flex items-center gap-2">
              <Database size={10} />
              {path.type} Path [{path.pattern.replace('_', ' ')}]
            </span>
            <span className="text-sm font-mono text-drac-accent">{conditionStr || "Default Path"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {path.tables.length > 0 && (
            <span className="text-[10px] bg-drac-bg-tertiary border border-drac-border px-2 py-0.5 rounded text-drac-text-secondary flex items-center gap-1">
              <Table size={10} /> {path.tables.length} Tables
            </span>
          )}
          <span className="text-xs bg-drac-bg-primary border border-drac-border px-2 py-0.5 rounded text-drac-text-primary font-bold">
            {path.columns.length} Cols
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-drac-border bg-drac-bg-primary/50 flex flex-col gap-6">
          {/* Header & Actions */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-drac-success">
                <Terminal size={16} />
                <span className="text-sm font-bold uppercase tracking-tight">Main Table: {path.tableName}</span>
              </div>
              {path.tables.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {path.tables.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-drac-bg-tertiary border border-drac-border text-drac-text-secondary">
                      {t.joinType ? `${t.joinType} ` : ""}{t.name} {t.alias ? `as ${t.alias}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-drac-bg-tertiary border border-drac-border text-xs font-bold hover:border-drac-accent transition-all active:scale-95 group relative"
                onClick={() => copyToClipboard(path.fullSql, setCopiedRaw)}
                title="Copy raw extracted SQL (as in Java append)"
              >
                {copiedRaw ? <Check size={14} className="text-drac-success" /> : <Copy size={14} />}
                COPY RAW
              </button>
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-drac-bg-tertiary border border-drac-border text-xs font-bold hover:border-drac-accent transition-all active:scale-95 group relative"
                onClick={async () => {
                  try {
                    const formatted = await invoke<string>("format_sql", { query: path.fullSql });
                    copyToClipboard(formatted, setCopiedFormatted);
                  } catch (err) {
                    copyToClipboard(path.fullSql, setCopiedFormatted);
                  }
                }}
                title="Copy formatted SQL using Formatter Pro"
              >
                {copiedFormatted ? <Check size={14} className="text-drac-success" /> : <Code2 size={14} />}
                COPY FORMAT
              </button>
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-drac-bg-tertiary border border-drac-border text-xs font-bold hover:border-drac-accent transition-all active:scale-95"
                onClick={() => copyToClipboard(path.columns.map(c => c.en).join("\n"), setCopiedCols)}
              >
                {copiedCols ? <Check size={14} className="text-drac-success" /> : <Copy size={14} />}
                COPY COLS
              </button>
            </div>
          </div>

          {/* SQL Preview Section */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2 text-drac-text-secondary">
                <Code2 size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Reconstructed SQL</span>
              </div>
              <button 
                onClick={handleDeepAnalysis}
                disabled={isAnalyzing}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${
                  showDeepAnalysis 
                    ? "bg-drac-accent text-drac-bg-secondary" 
                    : "bg-drac-bg-tertiary text-drac-accent border border-drac-accent/30 hover:border-drac-accent"
                }`}
              >
                <Brain size={12} className={isAnalyzing ? "animate-spin" : ""} />
                {isAnalyzing ? "Analyzing..." : showDeepAnalysis ? "Hide Analysis" : "Deep Analysis"}
              </button>
            </div>
            
            {showDeepAnalysis && analysis && (
              <SQLDeepAnalysis sql={path.fullSql} analysis={analysis} />
            )}
 
            {!showDeepAnalysis && (
              <div className="relative">
                <textarea
                  readOnly
                  wrap="off"
                  className="w-full p-3 bg-drac-bg-primary border border-drac-border rounded-lg text-xs font-mono text-drac-text-primary resize-y h-32 min-h-[80px] max-h-[500px] outline-none scrollbar-dracula whitespace-pre overflow-x-auto"
                  value={path.fullSql}
                />
                {copiedRaw && (
                  <div className="absolute top-4 right-4 bg-drac-success text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-lg animate-bounce-in z-50 tracking-widest uppercase">
                    Raw SQL Copied
                  </div>
                )}
                {copiedFormatted && (
                  <div className="absolute top-4 right-4 bg-drac-success text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-lg animate-bounce-in z-50 tracking-widest uppercase">
                    Formatted SQL Copied
                  </div>
                )}
                {copiedCols && (
                  <div className="absolute top-4 right-4 bg-drac-success text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-lg animate-bounce-in z-50 tracking-widest uppercase">
                    Columns Copied
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SET / VALUES Section */}
          <ColumnTable 
            title={path.type === "UPDATE" ? "SET Clauses" : "Insert Columns"} 
            icon={<Settings size={14} />}
            columns={setCols} 
            translations={translations} 
          />

          {/* JOIN Section */}
          {joinOnCols.length > 0 && (
            <ColumnTable 
              title="Join Conditions" 
              icon={<Table size={14} />}
              columns={joinOnCols} 
              translations={translations} 
            />
          )}

          {/* WHERE Section */}
          {whereCols.length > 0 && (
            <ColumnTable 
              title="Where Conditions" 
              icon={<Filter size={14} />}
              columns={whereCols} 
              translations={translations} 
            />
          )}
        </div>
      )}
    </div>
  );
}

function ColumnTable({ title, icon, columns, translations }: { title: string, icon: React.ReactNode, columns: ColumnMapping[], translations: Record<string, DictionaryEntry | null> }) {
  if (columns.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-drac-text-secondary ml-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
      </div>
      <div className="overflow-auto resize-y h-40 min-h-[100px] max-h-[600px] rounded-lg border border-drac-border bg-drac-bg-primary shadow-inner scrollbar-dracula">
        <table className="w-full text-left border-collapse text-[11px] relative">
          <thead className="bg-drac-bg-tertiary text-drac-text-secondary border-b border-drac-border sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-2 font-bold uppercase tracking-wider">EN Column</th>
              <th className="px-4 py-2 font-bold uppercase tracking-wider whitespace-nowrap">→ Japanese</th>
              <th className="px-4 py-2 font-bold uppercase tracking-wider">Mapping / Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-drac-border/50">
            {columns.map((col, idx) => {
              const entry = translations[col.en];
              return (
                <tr key={idx} className="hover:bg-drac-bg-secondary/50 transition-colors group">
                  <td className="px-4 py-2 font-mono text-drac-text-primary whitespace-nowrap">{col.en}</td>
                  <td className="px-4 py-2">
                    {entry ? (
                      <span className="text-drac-accent font-medium">{entry.ja}</span>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-500/80 italic">
                        <AlertCircle size={10} />
                        Not in dictionary
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {col.isPlaceholder ? (
                      <span className="px-1.5 py-0.5 rounded bg-drac-bg-tertiary border border-drac-border text-[9px] text-drac-text-secondary font-mono">DYNAMIC</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-drac-success/10 border border-drac-success/20 text-[9px] text-drac-success font-mono truncate max-w-[150px] inline-block align-middle">
                        {col.value}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
