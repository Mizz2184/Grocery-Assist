import { useState, useEffect, useRef } from "react";
import { Search, X, ArrowRight, Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/TranslationContext";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  expanded?: boolean;
  className?: string;
  placeholder?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  isSearching?: boolean;
  onVoiceAgentToggle?: (isActive: boolean) => void;
  isVoiceAgentActive?: boolean;
}

export const SearchBar = ({
  onSearch,
  initialQuery = "",
  expanded = false,
  className,
  placeholder,
  query: controlledQuery,
  onQueryChange,
  isSearching = false,
  onVoiceAgentToggle,
  isVoiceAgentActive = false,
}: SearchBarProps) => {
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const query = controlledQuery !== undefined ? controlledQuery : localQuery;
  const [isExpanded, setIsExpanded] = useState(expanded);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { translateText, isTranslated } = useTranslation();

  // Initialize query with initialQuery when it changes
  useEffect(() => {
    if (initialQuery !== query) {
      setLocalQuery(initialQuery);
    }
  }, [initialQuery]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Update the local query if the controlled query changes
  useEffect(() => {
    if (controlledQuery !== undefined) {
      setLocalQuery(controlledQuery);
    }
  }, [controlledQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setLocalQuery(newQuery);
    if (onQueryChange) {
      onQueryChange(newQuery);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    if (onQueryChange) {
      onQueryChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleVoiceToggle = () => {
    if (onVoiceAgentToggle) {
      onVoiceAgentToggle(!isVoiceAgentActive);
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
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder || (isTranslated ? "Search products..." : translateText("Buscar productos..."))}
          className={cn(
            "pl-10 pr-28 h-12 rounded-full transition-all duration-300 focus:ring-2 focus:ring-primary/20",
            isExpanded ? "bg-background shadow-lg" : "bg-secondary/80"
          )}
          disabled={isSearching || isVoiceAgentActive}
        />
        
        <div className="absolute right-2 flex items-center gap-1">
          {query && !isVoiceAgentActive && (
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
          
          {onVoiceAgentToggle && (
            <Button
              type="button"
              variant={isVoiceAgentActive ? "default" : "ghost"}
              size="icon"
              onClick={handleVoiceToggle}
              className={cn(
                "rounded-full h-8 w-8 transition-all duration-300",
                isVoiceAgentActive && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              )}
              aria-label={isVoiceAgentActive ? "Stop voice agent" : "Start voice agent"}
            >
              {isVoiceAgentActive ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
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
            disabled={!query.trim() || isSearching || isVoiceAgentActive}
            aria-label="Search"
          >
            {isSearching ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
