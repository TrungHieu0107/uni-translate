import { AlertCircle } from "lucide-react";

interface VisualizerOutputProps {
  content: string;
}

export function VisualizerOutput({ content }: VisualizerOutputProps) {
  const lines = content.split("\n");
  const assignedGroups = new Set<string>();

  return (
    <pre className="flex-1 p-4 m-0 font-mono text-xs leading-relaxed overflow-auto scrollbar-dracula whitespace-pre select-text bg-drac-bg-primary text-drac-text-primary">
      {lines.map((line, i) => {
        let colorClass = "";
        let id: string | undefined = undefined;
        let showWarning = false;
        let displayLine = line;

        if (line.includes("◆【条件】")) {
          colorClass = "text-amber-400 font-bold";
          
          // Check for markers
          if (line.includes("[E]")) {
            displayLine = line.replace("[E]", "");
          } else if (line.includes("[P]")) {
            displayLine = line.replace("[P]", "");
            colorClass = "text-amber-400/70 font-bold italic";
          } else if (line.includes("[F]")) {
            displayLine = line.replace("[F]", "");
            colorClass = "text-amber-500 font-bold bg-amber-500/10 px-1 rounded";
            showWarning = true;
          }

          // Extract group ID (e.g. A1 or A1-1 -> A)
          const match = displayLine.match(/◆【条件】([A-Z])/);
          if (match) {
            const groupId = match[1];
            if (!assignedGroups.has(groupId)) {
              id = `group-${groupId}`;
              assignedGroups.add(groupId);
            }
          }
        } else if (line.includes("◆【条件ここまで】")) {
          colorClass = "text-drac-text-secondary opacity-50";
        }

        return (
          <div 
            key={i} 
            id={id}
            className={`${colorClass} transition-colors duration-300 flex items-center gap-2`}
          >
            {showWarning && <AlertCircle size={12} className="text-amber-500" />}
            {displayLine || " "}
          </div>
        );
      })}
    </pre>
  );
}
