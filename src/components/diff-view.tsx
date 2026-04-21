import { Token } from "../lib/sql-alias-resolver";

interface DiffViewProps {
  tokens: Token[];
}

export function DiffView({ tokens }: DiffViewProps) {
  return (
    <pre className="flex-1 p-4 m-0 font-mono text-xs leading-relaxed overflow-auto scrollbar-dracula whitespace-pre-wrap select-text bg-drac-bg-primary text-drac-text-primary">
      {tokens.map((token, idx) => {
        let className = "text-drac-text-primary";
        if (token.kind === "keyword") className = "text-drac-accent font-bold";
        else if (token.kind === "string") className = "text-drac-success";
        else if (token.kind === "comment") className = "text-drac-text-secondary italic opacity-40";
        else if (token.kind === "operator" || token.kind === "dot") className = "text-drac-text-accent";
        else if (token.kind === "punctuation") className = "text-drac-text-secondary";

        if (token.isResolved) {
          return (
            <span key={idx} className="inline-flex items-center align-baseline mx-0.5">
              <span className="bg-drac-danger/20 text-drac-danger line-through px-1 rounded-l opacity-70">
                {token.originalValue}
              </span>
              <span className="bg-drac-success/20 text-drac-success font-bold px-1 rounded-r shadow-[0_0_10px_rgba(80,250,123,0.1)]">
                {token.value}
              </span>
            </span>
          );
        }

        return (
          <span key={idx} className={className}>
            {token.value}
          </span>
        );
      })}
    </pre>
  );
}
