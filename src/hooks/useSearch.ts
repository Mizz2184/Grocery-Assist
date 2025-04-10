import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  store: string;
  unit?: string;
}

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error searching products:', error);
        return;
      }

      setSearchResults(data || []);
    };

    const debounceTimeout = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimeout);
  }, [query]);

  return { query, setQuery, searchResults };
}; 