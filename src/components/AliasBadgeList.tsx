import { ArrowRight, Database, FolderCode, FunctionSquare } from "lucide-react";
import { AliasTarget } from "../lib/sqlAliasResolver";

interface AliasBadgeListProps {
  aliasMap: Record<string, AliasTarget>;
  unknownAliases: string[];
}

export function AliasBadgeList({ aliasMap, unknownAliases }: AliasBadgeListProps) {
  const aliases = Object.entries(aliasMap);

  if (aliases.length === 0 && unknownAliases.length === 0) {
    return (
      <div className="text-[10px] text-drac-text-secondary italic">
        No aliases detected in this query.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary mr-1">
        Detected:
      </span>
      {aliases.map(([alias, target]) => {
        if (target.kind === "table") {
          return (
            <div 
              key={alias} 
              className="flex items-center gap-2 px-2 py-1 rounded bg-drac-bg-tertiary border border-drac-border shadow-sm animate-fade-in"
              title={`Alias "${alias}" maps to table "${target.name}"${target.originalAlias && target.originalAlias !== alias ? ` (Normalized to: ${target.originalAlias})` : ""}`}
            >
              <div className="flex flex-col items-center">
                 <span className="text-[10px] font-mono font-bold text-drac-accent">{alias}</span>
                 {target.originalAlias && target.originalAlias.toUpperCase() !== alias.toUpperCase() && (
                   <span className="text-[8px] font-mono text-drac-purple opacity-70">({target.originalAlias})</span>
                 )}
              </div>
              <ArrowRight size={10} className="text-drac-text-secondary" />
              <Database size={10} className="text-drac-success" />
              <span className="text-[10px] font-mono text-drac-text-primary">{target.name}</span>
            </div>
          );
        } else if (target.kind === "subquery") {
          return (
            <div 
              key={alias} 
              className="flex items-center gap-2 px-2 py-1 rounded bg-drac-bg-secondary border border-drac-border shadow-sm animate-fade-in opacity-80"
              title={`Alias "${alias}" refers to a Subquery (Will not expand)`}
            >
              <span className="text-[10px] font-mono font-bold text-drac-text-secondary">{alias}</span>
              <ArrowRight size={10} className="text-drac-text-secondary/50" />
              <FolderCode size={10} className="text-drac-purple" />
              <span className="text-[10px] font-mono text-drac-text-secondary italic">(subquery)</span>
            </div>
          );
        } else if (target.kind === "cte") {
          return (
            <div 
              key={alias} 
              className="flex items-center gap-2 px-2 py-1 rounded bg-drac-bg-secondary border border-drac-border shadow-sm animate-fade-in opacity-80"
              title={`Alias "${alias}" refers to CTE "${target.name}" (Will not expand)`}
            >
              <span className="text-[10px] font-mono font-bold text-drac-text-secondary">{alias}</span>
              <ArrowRight size={10} className="text-drac-text-secondary/50" />
              <FunctionSquare size={10} className="text-drac-cyan" />
              <span className="text-[10px] font-mono text-drac-text-secondary italic">(CTE) {target.name}</span>
            </div>
          );
        }
        return null;
      })}
      
      {unknownAliases.map((ua) => (
        <div 
          key={ua} 
          className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 shadow-sm animate-pulse"
          title={`Warning: Alias "${ua}" is used but not defined in FROM/JOIN clauses.`}
        >
          <span className="text-[10px] font-mono font-bold text-amber-500">⚠ Unknown: {ua}</span>
        </div>
      ))}
    </div>
  );
}
