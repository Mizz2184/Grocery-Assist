import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/context/SearchContext';

/**
 * A hook for handling navigation while preserving search state
 * This ensures when a user navigates away from the search page and back,
 * their search results and scroll position are preserved
 */
export const useSearchNavigation = () => {
  const navigate = useNavigate();
  const { query, searchResults, scrollPosition } = useSearch();

  // Save the current search state directly to sessionStorage
  const saveSearchState = useCallback(() => {
    // Only save if we have meaningful data
    if (query || searchResults.length > 0) {
      console.log('useSearchNavigation: Directly saving search state to sessionStorage BEFORE navigation...', {
        query,
        resultsCount: searchResults.length,
        scrollPosition
      });
      
      // Direct synchronous write to sessionStorage
      sessionStorage.setItem('search_query', query);
      sessionStorage.setItem('search_results', JSON.stringify(searchResults));
      sessionStorage.setItem('search_scroll_position', scrollPosition.toString());
      console.log('useSearchNavigation: Direct save complete.');
    } else {
      console.log('useSearchNavigation: Skipping direct save, state is empty.');
    }
  }, [query, searchResults, scrollPosition]);

  // Navigate to a new page while preserving search state
  const navigatePreservingSearch = useCallback((
    to: string, 
    options?: { replace?: boolean }
  ) => {
    console.log('useSearchNavigation: Calling saveSearchState before navigating...');
    saveSearchState();
    navigate(to, options);
  }, [navigate, saveSearchState]);

  // Navigate back to the search page and restore state
  const navigateBackToSearch = useCallback(() => {
    // Everything needed for restoration is already in sessionStorage
    
    // Set a flag to indicate we're returning to search results
    // This helps the Index component know we want to restore our search
    sessionStorage.setItem('restore_search_on_return', 'true');
    
    // Log what we're saving before navigation
    console.log('Navigating back to search with state to restore:', {
      query,
      resultsCount: searchResults.length,
      scrollPosition
    });
    
    // Make sure search state is freshly saved before navigation
    console.log('useSearchNavigation: Calling saveSearchState before navigating back...');
    saveSearchState();
    
    // Navigate to the home/search page
    navigate('/home');
  }, [navigate, query, saveSearchState, searchResults.length, scrollPosition]);

  return {
    navigatePreservingSearch,
    navigateBackToSearch,
    saveSearchState
  };
}; 