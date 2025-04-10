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
  const [query, setQuery] = useState<string>(() => {
    const savedQuery = sessionStorage.getItem('search_query');
    return savedQuery || '';
  });
  
  const [searchResults, setSearchResults] = useState<Product[]>(() => {
    const savedResults = sessionStorage.getItem('search_results');
    return savedResults ? JSON.parse(savedResults) : [];
  });
  
  const [scrollPosition, setScrollPosition] = useState<number>(() => {
    const savedPosition = sessionStorage.getItem('search_scroll_position');
    return savedPosition ? parseInt(savedPosition, 10) : 0;
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
    sessionStorage.removeItem('search_query');
    sessionStorage.removeItem('search_results');
    sessionStorage.removeItem('search_scroll_position');
  }, []);

  // Removed the debounced search effect to prevent automatic search when typing
  
  // Session storage sync - only run when values actually change
  useEffect(() => {
    if (query || searchResults.length > 0 || scrollPosition > 0) {
      sessionStorage.setItem('search_query', query);
      sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
    }
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