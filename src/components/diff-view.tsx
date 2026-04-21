import { Token } from "../lib/sql-alias-resolver";

interface DiffViewProps {
  tokens: Token[];
}

export function DiffView({ tokens }: DiffViewProps) {
  return (
    <pre className="flex-1 p-4 m-0 font-mono text-xs leading-relaxed overflow-auto scrollbar-dracula whitespace-pre-wrap select-text bg-drac-bg-primary">
      {tokens.map((token, idx) => {
        if (token.isResolved) {
          return (
            <span key={idx} className="inline-flex flex-wrap items-center">
              <span className="text-drac-danger line-through opacity-70 bg-drac-danger-bg px-0.5 rounded-sm">
                {token.originalValue}
              </span>
              <span className="text-drac-success font-bold underline bg-drac-success/10 px-0.5 rounded-sm mx-0.5 animate-fade-in">
                {token.value}
              </span>
            </span>
          );
        }

        // Basic syntax coloring
        let className = "text-drac-text-primary";
        if (token.kind === "keyword") className = "text-drac-accent font-bold";
        else if (token.kind === "string") className = "text-drac-success";
        else if (token.kind === "comment") className = "text-drac-text-secondary italic";
        else if (token.kind === "operator" || token.kind === "dot") className = "text-drac-text-accent";
        else if (token.kind === "punctuation") className = "text-drac-text-secondary";

        return (
          <span key={idx} className={className}>
            {token.value}
          </span>
        );
      })}
    </pre>
  );
}
