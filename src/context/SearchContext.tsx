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
      if (savedResults) {
        try {
          const parsedResults = JSON.parse(savedResults);
          console.log(`Loaded ${parsedResults.length} search results from session storage`);
          
          // Check for store property
          if (parsedResults.length > 0) {
            const storeTypes = parsedResults.map((p: any) => p.store || 'unknown');
            const uniqueStores = [...new Set(storeTypes)];
            console.log('Store types in loaded results:', uniqueStores);
            
            // Fix any missing store properties
            const fixedResults = parsedResults.map((p: any) => {
              if (!p.store) {
                console.warn('Product missing store property, attempting to detect from id:', p.id);
                // Try to determine store from id
                if (p.id.includes('maxipali')) {
                  p.store = 'MaxiPali';
                } else if (p.id.includes('masxmenos')) {
                  p.store = 'MasxMenos';
                } else if (p.id.includes('walmart')) {
                  p.store = 'Walmart';
                } else {
                  p.store = 'Unknown';
                }
              }
              return p;
            });
            
            setSearchResults(fixedResults);
          } else {
            setSearchResults(parsedResults);
          }
        } catch (parseError) {
          console.error('Error parsing saved search results:', parseError);
          setSearchResults([]);
        }
      }
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
        console.log(`Saving ${searchResults.length} search results to session storage`);
        
        // Check for store property
        const storeTypes = searchResults.map(p => p.store || 'unknown');
        const uniqueStores = [...new Set(storeTypes)];
        console.log('Store types in saved results:', uniqueStores);
        
        // Detailed store breakdown
        const storeCount = {
          MaxiPali: searchResults.filter(p => p.store === 'MaxiPali').length,
          MasxMenos: searchResults.filter(p => p.store === 'MasxMenos').length,
          Walmart: searchResults.filter(p => p.store === 'Walmart').length,
          Unknown: searchResults.filter(p => !p.store || p.store === 'Unknown').length
        };
        console.log('Store distribution in search results:', storeCount);
        
        sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      }
      
      if (scrollPosition > 0) {
        sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
      }
    } catch (error) {
      console.error('Error saving search state to session storage:', error);
    }
  }, [query, searchResults, scrollPosition]);

  const setSearchResultsWithLogging = (results: Product[]) => {
    console.log(`Setting ${results.length} search results`);
    
    // Verify store property is set for all products
    const missingStore = results.filter(p => !p.store);
    if (missingStore.length > 0) {
      console.warn(`${missingStore.length} products missing store property, adding default`);
      
      // Fix missing store property
      results = results.map(p => {
        if (!p.store) {
          // Try to guess store from other properties
          let store: 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Unknown' = 'Unknown';
          if (p.id?.includes('maxipali') || p.name?.toLowerCase().includes('maxipali')) {
            store = 'MaxiPali';
          } else if (p.id?.includes('masxmenos') || p.name?.toLowerCase().includes('masxmenos')) {
            store = 'MasxMenos';
          } else if (p.id?.includes('walmart') || p.name?.toLowerCase().includes('walmart')) {
            store = 'Walmart';
          }
          return { ...p, store };
        }
        return p;
      });
    }
    
    // Check for invalid products (missing required fields)
    const invalidProducts = results.filter(p => !p.id || !p.name || typeof p.price !== 'number');
    if (invalidProducts.length > 0) {
      console.warn(`Found ${invalidProducts.length} invalid products, filtering them out`);
      console.log('Sample invalid product:', invalidProducts[0]);
      results = results.filter(p => p.id && p.name && typeof p.price === 'number');
    }
    
    // Log store distribution
    const storeCount = {
      MaxiPali: results.filter(p => p.store === 'MaxiPali').length,
      MasxMenos: results.filter(p => p.store === 'MasxMenos').length,
      Walmart: results.filter(p => p.store === 'Walmart').length,
      Other: results.filter(p => p.store !== 'MaxiPali' && p.store !== 'MasxMenos' && p.store !== 'Walmart').length
    };
    console.log('Search results by store:', storeCount);
    
    setSearchResults(results);
  };

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
    setSearchResults: setSearchResultsWithLogging,
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