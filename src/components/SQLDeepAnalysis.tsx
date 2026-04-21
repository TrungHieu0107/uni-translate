import { useState, useMemo } from "react";
import { Shield, Brain, Activity, List, MessageSquare, AlertTriangle, Table as TableIcon, Layers } from "lucide-react";

export interface CteInfo {
  name: string;
  is_recursive: boolean;
  depth: number;
}

export interface TableUsage {
  name: string;
  alias: string;
  count: number;
}

export interface SelfJoinChain {
  table_name: string;
  aliases: string[];
}

export interface WindowInfo {
  func: string;
  pos: number;
}

export interface SqlAnalysis {
  ctes: CteInfo[];
  self_joins: SelfJoinChain[];
  tables: TableUsage[];
  window_funcs: WindowInfo[];
  complexity_score: number;
  suggestions: string[];
  highlighted_positions: [number, number, string][];
}

interface SQLDeepAnalysisProps {
  sql: string;
  analysis: SqlAnalysis;
}

export function SQLDeepAnalysis({ sql, analysis }: SQLDeepAnalysisProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "graph" | "highlights">("summary");

  const renderedSql = useMemo(() => {
    if (!analysis.highlighted_positions.length) return sql;

    // Sort highlights by start position
    const sorted = [...analysis.highlighted_positions].sort((a, b) => a[0] - b[0]);
    
    let result: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach(([start, end, type], idx) => {
      // Add text before highlight
      if (start > lastIndex) {
        result.push(sql.substring(lastIndex, start));
      }

      // Add highlighted span
      const content = sql.substring(start, end);
      const colorClass = 
        type === "keyword" ? "text-drac-accent font-bold" :
        type === "table" ? "text-drac-success font-bold" :
        type === "alias" ? "text-drac-purple italic" :
        type === "cte" ? "text-drac-cyan underline" :
        type === "window" ? "text-drac-orange italic underline" :
        "text-drac-text-primary";

      result.push(
        <span key={idx} className={colorClass} title={type}>
          {content}
        </span>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < sql.length) {
      result.push(sql.substring(lastIndex));
    }

    return result;
  }, [sql, analysis]);

  return (
    <div className="bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden animate-fade-in flex flex-col h-[500px]">
      <div className="bg-drac-bg-tertiary px-4 py-2 border-b border-drac-border flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-drac-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-drac-accent">Deep SQL Analysis</span>
        </div>
        <div className="flex gap-1">
          <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")} label="Overview" icon={<List size={12}/>} />
          <TabButton active={activeTab === "highlights"} onClick={() => setActiveTab("highlights")} label="Highlights" icon={<Activity size={12}/>} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "summary" && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-dracula bg-drac-bg-primary/20">
            {/* Complexity Score */}
            <div className="flex items-center gap-4 bg-drac-bg-secondary/50 p-4 rounded-lg border border-drac-border">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-4 border-drac-bg-tertiary"></div>
                <div 
                  className="absolute inset-0 rounded-full border-4 border-drac-accent" 
                  style={{ 
                    clipPath: `inset(${100 - Math.min(100, (analysis.complexity_score / 200) * 100)}% 0 0 0)`,
                    transition: 'all 1s ease-out'
                  }}
                ></div>
                <span className="text-xl font-bold text-drac-accent">{analysis.complexity_score}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-drac-text-primary">Complexity Score</h3>
                <p className="text-[10px] text-drac-text-secondary mt-1">
                  Based on CTEs ({analysis.ctes.length}), Self-joins ({analysis.self_joins.length}), and Nesting.
                </p>
              </div>
            </div>

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-drac-orange ml-1">
                  <MessageSquare size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Suggestions</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 p-2 rounded bg-drac-orange/5 border border-drac-orange/20 text-[11px] text-drac-text-primary">
                      <span className="text-drac-orange shrink-0">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Self Joins */}
            {analysis.self_joins.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-drac-purple ml-1">
                  <Layers size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Self-Join Detection</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {analysis.self_joins.map((sj, i) => (
                    <div key={i} className="p-3 rounded bg-drac-bg-tertiary border border-drac-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-drac-purple">{sj.table_name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-drac-purple/20 text-drac-purple border border-drac-purple/30 font-bold uppercase">Multi-Alias</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {sj.aliases.map((a, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && <span className="text-drac-text-secondary">→</span>}
                            <code className="px-1.5 py-0.5 rounded bg-drac-bg-primary border border-drac-border text-drac-accent">{a}</code>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Stats */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-drac-success ml-1">
                <TableIcon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Table Usage Map</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-drac-border bg-drac-bg-primary">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-drac-bg-tertiary text-drac-text-secondary border-b border-drac-border">
                    <tr>
                      <th className="px-3 py-1.5 font-bold uppercase">Table</th>
                      <th className="px-3 py-1.5 font-bold uppercase">Alias</th>
                      <th className="px-3 py-1.5 font-bold uppercase text-right">Hits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-drac-border/50">
                    {analysis.tables.map((t, i) => (
                      <tr key={i} className="hover:bg-drac-bg-secondary/50">
                        <td className="px-3 py-1.5 text-drac-success font-medium">{t.name}</td>
                        <td className="px-3 py-1.5 text-drac-text-secondary italic">{t.alias}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{t.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "highlights" && (
          <div className="flex-1 bg-drac-bg-primary p-4 overflow-y-auto scrollbar-dracula">
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
              {renderedSql}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all text-[10px] font-bold uppercase tracking-wider ${
        active ? "bg-drac-accent text-drac-bg-secondary shadow-sm" : "text-drac-text-secondary hover:text-drac-text-primary hover:bg-drac-bg-primary/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
