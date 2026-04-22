import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface SearchBoxProps {
  onSearch: (keyword: string) => void;
  disabled: boolean;
}

export function SearchBox({ onSearch, disabled }: SearchBoxProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, 150);

    return () => clearTimeout(handler);
  }, [value, onSearch]);

  return (
    <div className="sticky top-0 z-20 bg-drac-bg-primary border-b border-drac-border flex items-center px-6">
      <Search className="text-drac-text-secondary peer-focus:text-drac-accent transition-colors" size={24} />
      <input
        type="text"
        className="flex-1 border-none bg-transparent py-4 px-4 text-base text-drac-text-primary outline-none font-inherit placeholder-white/20 peer"
        placeholder="Type to translate (Japanese / English)..."
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}
