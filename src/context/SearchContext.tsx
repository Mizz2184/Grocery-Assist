import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '@/lib/types/store';
import { supabase } from '@/lib/supabase';

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
  search: (searchQuery: string) => Promise<void>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  // Add initialization logging

  const savedQueryFromSession = sessionStorage.getItem('search_query');
  const savedResultsFromSession = sessionStorage.getItem('search_results');
  const savedPositionFromSession = sessionStorage.getItem('search_scroll_position');

  const [query, setQuery] = useState<string>(() => {
    return savedQueryFromSession || '';
  });
  
  const [searchResults, setSearchResults] = useState<Product[]>(() => {
    if (savedResultsFromSession) {
      try {
        const parsed = JSON.parse(savedResultsFromSession);
        if (Array.isArray(parsed)) {

          return parsed;
        }
      } catch (error) {
        console.error('Error parsing saved search results:', error);
      }
    }
    return [];
  });
  
  const [scrollPosition, setScrollPosition] = useState<number>(() => {
    return savedPositionFromSession ? parseInt(savedPositionFromSession, 10) : 0;
  });

  const [isSearching, setIsSearching] = useState(false);

  // Memoize the search function to prevent unnecessary recreations
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .textSearch('name', searchQuery)
        .limit(50);

      if (products) {
        setSearchResults(products);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {

    setQuery('');
    setSearchResults([]);
    setScrollPosition(0);
    setIsSearching(false);
    // Explicitly clear sessionStorage items

    sessionStorage.removeItem('search_query');
    sessionStorage.removeItem('search_results');
    sessionStorage.removeItem('search_scroll_position');

  }, []);

  // Removed the debounced search effect to prevent automatic search when typing
  
  // Session storage sync - save when state changes
  useEffect(() => {
    // Log when this effect is triggered

    // Only save if we have meaningful data to prevent clearing valid state with empty state
    if (query.trim() || searchResults.length > 0 || scrollPosition > 0) {

      sessionStorage.setItem('search_query', query);
      sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      sessionStorage.setItem('search_scroll_position', scrollPosition.toString());

    } else {

    }
  }, [query, searchResults, scrollPosition]);

  // Create separate effect for page visibility changes to ensure state is saved when tab/window is closed
  useEffect(() => {
    const handleVisibilityChange = () => {

      if (document.visibilityState === 'hidden' && (query || searchResults.length > 0)) {

        sessionStorage.setItem('search_query', query);
        sessionStorage.setItem('search_results', JSON.stringify(searchResults));
        sessionStorage.setItem('search_scroll_position', scrollPosition.toString());

      }
    };

    // Save state when user leaves the page
    window.addEventListener('beforeunload', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {

      window.removeEventListener('beforeunload', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [query, searchResults, scrollPosition]);

  // Debug logging - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {

    }
  }, [searchResults.length]); // Only depend on the length, not the full array

  const value = useMemo(() => ({
    query,
    setQuery,
    searchResults,
    setSearchResults,
    scrollPosition,
    setScrollPosition,
    search,
    isSearching,
    setIsSearching,
    clearSearch
  }), [query, searchResults, scrollPosition, search, isSearching, clearSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  
  // Add debug effect to monitor search results
  useEffect(() => {
    if (context.searchResults && context.searchResults.length > 0) {

      // Log store distribution
      const storeCount = {
        MaxiPali: context.searchResults.filter(p => p.store === 'MaxiPali').length,
        MasxMenos: context.searchResults.filter(p => p.store === 'MasxMenos').length,
        Walmart: context.searchResults.filter(p => p.store === 'Walmart').length,
        Unknown: context.searchResults.filter(p => !p.store || p.store === 'Unknown').length
      };

      if (context.searchResults.length > 0) {

      }
    }
  }, [context.searchResults]);
  
  return context;
} 