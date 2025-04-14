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
  console.log('SearchProvider initializing, checking sessionStorage for saved state');
  
  const savedQueryFromSession = sessionStorage.getItem('search_query');
  const savedResultsFromSession = sessionStorage.getItem('search_results');
  const savedPositionFromSession = sessionStorage.getItem('search_scroll_position');
  
  console.log('SessionStorage state found:', { 
    hasQuery: !!savedQueryFromSession,
    hasResults: !!savedResultsFromSession,
    resultsCount: savedResultsFromSession ? JSON.parse(savedResultsFromSession).length : 0,
    position: savedPositionFromSession ? parseInt(savedPositionFromSession, 10) : 0
  });

  const [query, setQuery] = useState<string>(() => {
    return savedQueryFromSession || '';
  });
  
  const [searchResults, setSearchResults] = useState<Product[]>(() => {
    if (savedResultsFromSession) {
      try {
        const parsed = JSON.parse(savedResultsFromSession);
        if (Array.isArray(parsed)) {
          console.log(`Initialized searchResults state with ${parsed.length} items from sessionStorage`);
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
    console.log('SearchContext: Clearing search state...');
    setQuery('');
    setSearchResults([]);
    setScrollPosition(0);
    setIsSearching(false);
    // Explicitly clear sessionStorage items
    console.log('SearchContext/clearSearch: Clearing sessionStorage...');
    sessionStorage.removeItem('search_query');
    sessionStorage.removeItem('search_results');
    sessionStorage.removeItem('search_scroll_position');
    console.log('SearchContext: SessionStorage cleared.');
  }, []);

  // Removed the debounced search effect to prevent automatic search when typing
  
  // Session storage sync - save when state changes
  useEffect(() => {
    // Log when this effect is triggered
    console.log(`SearchContext: Saving state effect triggered. query:"${query}", results:${searchResults.length}, scroll:${scrollPosition}`);

    // Only save if we have meaningful data to prevent clearing valid state with empty state
    if (query.trim() || searchResults.length > 0 || scrollPosition > 0) {
      console.log(`SearchContext: Saving state to sessionStorage...`);
      sessionStorage.setItem('search_query', query);
      sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
      console.log('SearchContext: State saved.');
    } else {
      console.log('SearchContext: Skipping save, state is empty.');
    }
  }, [query, searchResults, scrollPosition]);

  // Create separate effect for page visibility changes to ensure state is saved when tab/window is closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log(`SearchContext: Visibility changed to ${document.visibilityState}`);
      if (document.visibilityState === 'hidden' && (query || searchResults.length > 0)) {
        console.log('SearchContext: Page hidden, saving search state to sessionStorage...');
        sessionStorage.setItem('search_query', query);
        sessionStorage.setItem('search_results', JSON.stringify(searchResults));
        sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
        console.log('SearchContext: State saved due to page hide.');
      }
    };

    // Save state when user leaves the page
    window.addEventListener('beforeunload', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('SearchContext: Cleaning up visibility change listeners.');
      window.removeEventListener('beforeunload', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [query, searchResults, scrollPosition]);

  // Debug logging - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Search results updated:', searchResults.length);
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
      console.log(`useSearch: Currently has ${context.searchResults.length} search results`);
      
      // Log store distribution
      const storeCount = {
        MaxiPali: context.searchResults.filter(p => p.store === 'MaxiPali').length,
        MasxMenos: context.searchResults.filter(p => p.store === 'MasxMenos').length,
        Walmart: context.searchResults.filter(p => p.store === 'Walmart').length,
        Unknown: context.searchResults.filter(p => !p.store || p.store === 'Unknown').length
      };
      console.log('Current search results by store:', storeCount);
      
      if (context.searchResults.length > 0) {
        console.log('First result example:', context.searchResults[0]);
      }
    }
  }, [context.searchResults]);
  
  return context;
} 