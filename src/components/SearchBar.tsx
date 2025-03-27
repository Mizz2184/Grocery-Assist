import { useState, useEffect, useRef } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  expanded?: boolean;
  className?: string;
}

export const SearchBar = ({ onSearch, initialQuery = "", expanded = false, className }: SearchBarProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Initialize query with initialQuery when it changes
  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full transition-all duration-500 ease-apple group",
        className
      )}
    >
      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground transition-all duration-300">
          <Search className={cn(
            "w-5 h-5 transition-all duration-300",
            isExpanded && "text-primary"
          )} />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="Search products, brands, barcodes..."
          className={cn(
            "pl-10 pr-20 h-12 rounded-full transition-all duration-300 focus:ring-2 focus:ring-primary/20",
            isExpanded ? "bg-background shadow-lg" : "bg-secondary/80"
          )}
        />
        
        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="rounded-full h-8 w-8"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            size="icon"
            className={cn(
              "rounded-full h-8 w-8 transition-all duration-300",
              "bg-black dark:bg-white text-white dark:text-black",
              !query && "opacity-30"
            )}
            disabled={!query.trim()}
            aria-label="Search"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};
