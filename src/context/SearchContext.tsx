import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/types/store';

interface SearchContextType {
  query: string;
  searchResults: Product[];
  scrollPosition: number;
  isSearching: boolean;
  setQuery: (query: string) => void;
  setSearchResults: (results: Product[]) => void;
  setScrollPosition: (position: number) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Load search state from session storage on initial load
  useEffect(() => {
    try {
      const savedQuery = sessionStorage.getItem('search_query');
      const savedResults = sessionStorage.getItem('search_results');
      const savedScrollPosition = sessionStorage.getItem('search_scroll_position');
      
      if (savedQuery) setQuery(savedQuery);
      if (savedResults) setSearchResults(JSON.parse(savedResults));
      if (savedScrollPosition) setScrollPosition(parseInt(savedScrollPosition, 10));
    } catch (error) {
      console.error('Error loading search state from session storage:', error);
    }
  }, []);

  // Save search state to session storage when it changes
  useEffect(() => {
    try {
      if (query) {
        sessionStorage.setItem('search_query', query);
      }
      
      if (searchResults.length > 0) {
        sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      }
      
      if (scrollPosition > 0) {
        sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
      }
    } catch (error) {
      console.error('Error saving search state to session storage:', error);
    }
  }, [query, searchResults, scrollPosition]);

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setScrollPosition(0);
    setIsSearching(false);
    
    // Clear from session storage
    sessionStorage.removeItem('search_query');
    sessionStorage.removeItem('search_results');
    sessionStorage.removeItem('search_scroll_position');
  };

  const value = {
    query,
    searchResults,
    scrollPosition,
    isSearching,
    setQuery,
    setSearchResults,
    setScrollPosition,
    setIsSearching,
    clearSearch
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
} 