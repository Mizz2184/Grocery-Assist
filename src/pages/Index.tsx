import { useState, useEffect, useRef, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { mockGroceryLists } from "@/utils/productData";
import { stores } from "@/utils/storeData";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/context/SearchContext";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search as SearchIcon, Scan, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { searchMaxiPaliProducts, searchMasxMenosProducts, searchWalmartProducts } from "@/lib/services";
import { addProductToGroceryList, getOrCreateDefaultList, getUserGroceryLists } from "@/lib/services/groceryListService";
import { Product } from "@/lib/types/store";
import { Button } from "@/components/ui/button";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from "@/context/TranslationContext";
import { TranslatedText } from "@/App";
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const ProductGrid = ({ products, onAddToList, isProductInList }: { 
  products: Product[], 
  onAddToList: (id: string) => void,
  isProductInList: (id: string, store: string) => boolean 
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-4">
      {products.map((product, index) => (
        <div 
          key={product.id} 
          className="w-full flex flex-col bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          style={{ height: "450px" }}
          data-store={product.store || 'unknown'}
        >
          <div className="relative" style={{ height: "250px" }}>
            <img 
              src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
              alt={product.name}
              className="w-full h-full object-contain rounded-t-lg bg-white"
            />
            <div className="absolute top-2 right-2">
              <div className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${product.store === 'Walmart' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  product.store === 'MaxiPali' ? 'bg-yellow-500 text-black hover:bg-yellow-600' :
                  product.store === 'MasxMenos' ? 'bg-green-600 text-white hover:bg-green-700' :
                  'bg-gray-500 text-white'}
              `}>
                {product.store || 'Unknown'}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-base font-medium leading-tight line-clamp-2">
                {product.name}
              </h3>
              <button
                onClick={() => onAddToList(product.id)}
                disabled={isProductInList(product.id, product.store || '')}
                className={`
                  shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${isProductInList(product.id, product.store || '') 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                `}
              >
                {isProductInList(product.id, product.store || '') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                )}
              </button>
            </div>
            
            <div className="mt-auto flex items-end justify-between">
              <div>
                <div className="text-lg font-semibold">
                  ₡{new Intl.NumberFormat('es-CR').format(product.price)}
                </div>
                <div className="text-sm text-muted-foreground">
                  ${(product.price / 510).toFixed(2)}
                </div>
              </div>
              {product.brand && (
                <div className="text-sm text-muted-foreground">
                  {product.brand}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Index = () => {
  const { 
    query, setQuery,
    searchResults, setSearchResults,
    scrollPosition, setScrollPosition,
    isSearching, setIsSearching
  } = useSearch();
  const [productsInList, setProductsInList] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState<'all' | 'MaxiPali' | 'MasxMenos' | 'Walmart'>('all');
  const [showBanner, setShowBanner] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const { translateUI } = useTranslation();

  // Handle payment success redirects
  useEffect(() => {
    // Check if this is a redirect after a payment was initiated
    // In test mode, we don't get a payment_intent parameter back
    const isPotentialPaymentRedirect = localStorage.getItem(`payment_session_${user?.id}`);
    
    if (isPotentialPaymentRedirect && user) {
      // Process the successful payment
      toast({
        title: translateUI("Payment Successful"),
        description: translateUI("Thank you for your payment. You now have full access to search for products."),
      });
      
      // User is already marked as paid in the Payment.tsx component for test mode
      // Clear the session ID
      localStorage.removeItem(`payment_session_${user.id}`);
    }
  }, [user, toast, translateUI]);

  // Restore scroll position when returning to the page
  useEffect(() => {
    if (scrollPosition > 0 && searchResultsRef.current) {
      window.scrollTo({
        top: scrollPosition,
        behavior: 'auto'
      });
    }
  }, [scrollPosition, searchResults]);

  // Save scroll position when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (query && searchResults.length > 0) {
        setScrollPosition(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [query, searchResults, setScrollPosition]);

  // Fetch user's products in lists when user changes
  useEffect(() => {
    const fetchUserLists = async () => {
      if (!user) {
        setProductsInList(new Set());
        console.log('No user logged in, clearing productsInList');
        return;
      }

      try {
        console.log('Fetching user lists to build productsInList for user:', user.id);
        const lists = await getUserGroceryLists(user.id);
        const productIds = new Set<string>();
        
        lists.forEach(list => {
          list.items.forEach(item => {
            // Simply use the product ID - this simplifies tracking
            productIds.add(item.productId);
          });
        });
        
        console.log('Updated productsInList, now contains', productIds.size, 'products');
        setProductsInList(productIds);
      } catch (error) {
        console.error('Error fetching user lists:', error);
      }
    };
    
    fetchUserLists();
  }, [user]);

  // Check if product is in any grocery list
  const isProductInList = (productId: string, store: string) => {
    const isInList = productsInList.has(productId);
    console.log(`Checking if product ${productId} is in list: ${isInList}`);
    return isInList;
  };

  // Helper function to sort products by relevance to search query
  const sortProductsByRelevance = (products: Product[], searchQuery: string): Product[] => {
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    
    return [...products].sort((a, b) => {
      // Prefer exact matches in name
      const aNameMatch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
      const bNameMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
      
      if (aNameMatch !== bNameMatch) {
        return bNameMatch - aNameMatch;
      }
      
      // Calculate relevance score based on how many terms match
      let aScore = 0;
      let bScore = 0;
      
      terms.forEach(term => {
        // Name is most important
        if (a.name.toLowerCase().includes(term)) aScore += 3;
        if (b.name.toLowerCase().includes(term)) bScore += 3;
        
        // Brand is next
        if ((a.brand || '').toLowerCase().includes(term)) aScore += 2;
        if ((b.brand || '').toLowerCase().includes(term)) bScore += 2;
        
        // Category is least important
        if ((a.category || '').toLowerCase().includes(term)) aScore += 1;
        if ((b.category || '').toLowerCase().includes(term)) bScore += 1;
      });
      
      // Sort by score, higher first
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      
      // If scores are equal, prefer products with images
      const aHasImage = a.imageUrl && a.imageUrl !== '' ? 1 : 0;
      const bHasImage = b.imageUrl && b.imageUrl !== '' ? 1 : 0;
      
      if (aHasImage !== bHasImage) {
        return bHasImage - aHasImage;
      }
      
      // Finally, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    
    console.log('Performing product search for:', searchQuery);
    setIsSearching(true);

    try {
      // Perform searches in parallel
      console.log('Starting parallel store searches...');
      const [maxiPaliResults, masxMenosResults, walmartResults] = await Promise.all([
        searchMaxiPaliProducts({ query: searchQuery }),
        searchMasxMenosProducts({ query: searchQuery }),
        searchWalmartProducts({ query: searchQuery })
      ]);
      console.log('All store API searches completed');

      // Debug full response data
      console.log('=== DEBUG SEARCH RESPONSES ===');
      console.log('MaxiPali response structure:', JSON.stringify(maxiPaliResults).substring(0, 200) + '...');
      console.log('MasxMenos response structure:', JSON.stringify(masxMenosResults).substring(0, 200) + '...');
      console.log('Walmart response structure:', JSON.stringify(walmartResults).substring(0, 200) + '...');

      let combinedResults: Product[] = [];
      let totalProductCount = 0;
      
      // Add MaxiPali results
      if (maxiPaliResults && maxiPaliResults.products && maxiPaliResults.products.length > 0) {
        console.log(`Adding ${maxiPaliResults.products.length} MaxiPali products`);
        // Make sure store field is set correctly and normalized
        const maxiPaliWithStore = maxiPaliResults.products.map(p => ({
          ...p,
          store: 'MaxiPali' as const // Keep as const for type safety
        }));
        combinedResults = [...combinedResults, ...maxiPaliWithStore];
        totalProductCount += maxiPaliResults.products.length;
        console.log(`Found ${maxiPaliResults.products.length} MaxiPali products`);
      } else {
        console.log('No MaxiPali products found');
      }
      
      // Add MasxMenos results
      if (masxMenosResults && masxMenosResults.products && masxMenosResults.products.length > 0) {
        console.log(`Adding ${masxMenosResults.products.length} MasxMenos products`);
        // Make sure store field is set correctly and normalized
        const masxMenosWithStore = masxMenosResults.products.map(p => ({
          ...p,
          store: 'MasxMenos' as const // Keep as const for type safety
        }));
        combinedResults = [...combinedResults, ...masxMenosWithStore];
        totalProductCount += masxMenosResults.products.length;
        console.log(`Found ${masxMenosResults.products.length} MasxMenos products`);
      } else {
        console.log('No MasxMenos products found');
      }
      
      // Add Walmart results
      if (walmartResults && walmartResults.products && walmartResults.products.length > 0) {
        console.log(`Adding ${walmartResults.products.length} Walmart products`);
        // Make sure store field is set correctly and normalized
        const walmartWithStore = walmartResults.products.map(p => ({
          ...p,
          store: 'Walmart' as const // Keep as const for type safety
        }));
        
        // Additional debug logging for Walmart products
        console.log('Walmart product examples:');
        walmartResults.products.slice(0, 2).forEach((p, i) => {
          console.log(`Walmart product ${i}: id=${p.id}, name=${p.name}, price=${p.price}, store=${p.store}`);
        });
        
        combinedResults = [...combinedResults, ...walmartWithStore];
        totalProductCount += walmartResults.products.length;
        console.log(`Found ${walmartResults.products.length} Walmart products`);
      } else {
        console.log('No Walmart products found or results are invalid');
        console.log('Walmart results structure:', walmartResults);
      }
      
      // If all searches failed or returned no results
      if (combinedResults.length === 0) {
        console.log('No products found across any store');
        toast({
          title: translateUI("No Se Encontraron Resultados"),
          description: translateUI(`No pudimos encontrar productos que coincidan con "${searchQuery}"`),
          variant: "destructive"
        });
      } else {
        console.log(`Found ${combinedResults.length} total products, by store count: MaxiPali=${maxiPaliResults.products?.length || 0}, MasxMenos=${masxMenosResults.products?.length || 0}, Walmart=${walmartResults.products?.length || 0}`);
        
        // Ensure all products have required properties
        combinedResults = combinedResults.filter(product => {
          if (!product.id || !product.name || typeof product.price !== 'number') {
            console.error('Invalid product found in results:', product);
            return false;
          }
          return true;
        });
        
        // Check for store type issues
        const storeTypes = combinedResults.map(p => p.store);
        const uniqueStores = [...new Set(storeTypes)];
        console.log('Store types in combined results:', uniqueStores);
        
        // Log sample of combined results
        console.log('Sample of combined results (first 2 products):', 
          combinedResults.slice(0, 2).map(p => ({
            id: p.id,
            name: p.name,
            store: p.store,
            price: p.price
          }))
        );
        
        toast({
          title: translateUI(`Se Encontraron ${totalProductCount} Productos`),
          description: translateUI(`Mostrando resultados para "${searchQuery}"`)
        });
      }
      
      setSearchResults(combinedResults);
      console.log('Set search results called with', combinedResults.length, 'products');
    } catch (error) {
      console.error('Error during search:', error);
      toast({
        title: translateUI("Error de Búsqueda"),
        description: translateUI("Ocurrió un error durante la búsqueda. Por favor intenta de nuevo."),
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToList = async (productId: string) => {
    try {
      if (!user) {
        toast({
          title: translateUI("Se requiere iniciar sesión"),
          description: translateUI("Por favor inicie sesión para agregar artículos a su lista de compras."),
          variant: "destructive",
        });
        navigate("/profile");
        return Promise.reject(new Error("User not signed in"));
      }
      
      // Find the product in the search results
      let product = searchResults.find(p => p.id === productId);
      
      if (!product) {
        console.error('Product not found in search results');
        toast({
          title: translateUI("Error"),
          description: translateUI("No se pudieron encontrar los detalles del producto"),
          variant: "destructive",
        });
        return Promise.reject(new Error('Product not found'));
      }
      
      console.log('Adding product to list:', product);
      
      // Get the default list or create one if it doesn't exist
      const defaultList = await getOrCreateDefaultList(user.id);
      
      if (!defaultList) {
        throw new Error('Could not create or retrieve default list');
      }
      
      let result: { success: boolean; message?: string; list?: any } = { success: false };
      
      try {
        // Add the product to the list via the database
        result = await addProductToGroceryList(defaultList.id, user.id, product);
      } catch (dbError) {
        console.error('Database error when adding product to list:', dbError);
        
        // Fallback to local storage only if database operation fails
        console.log('Using localStorage fallback for adding product');
        
        // Create a "fake" success result for local storage
        result = { 
          success: true,
          message: 'Added to list using local storage (database unavailable)' 
        };
        
        // Update local storage directly
        const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
        const listIndex = localLists.findIndex((list: any) => list.id === defaultList.id);
        
        if (listIndex >= 0) {
          const list = localLists[listIndex];
          const existingItemIndex = list.items.findIndex((item: any) => item.productId === product.id);
          
          if (existingItemIndex >= 0) {
            // Update quantity
            list.items[existingItemIndex].quantity += 1;
          } else {
            // Add new item
            list.items.push({
              id: uuidv4(),
              productId: product.id,
              quantity: 1,
              addedBy: user.id,
              addedAt: new Date().toISOString(),
              checked: false,
              productData: product
            });
          }
          
          localStorage.setItem('grocery_lists', JSON.stringify(localLists));
        }
      }
      
      if (!result.success) {
        toast({
          title: translateUI("Error"),
          description: result.message ? translateUI(result.message) : translateUI("No se pudo agregar el producto a la lista"),
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists - use the ID directly
      setProductsInList(prev => new Set([...prev, product.id]));
      
      toast({
        title: translateUI("Agregado a la lista"),
        description: translateUI(`${product.name || 'Producto'} agregado a ${defaultList.name}`),
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding product to list:', error);
      toast({
        title: translateUI("Error"),
        description: translateUI("No se pudo agregar el producto a tu lista"),
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };
  
  const handleAddScannedProduct = async (product: Product) => {
    if (!user) {
      toast({
        title: translateUI("Se requiere iniciar sesión"),
        description: translateUI("Por favor inicie sesión para agregar artículos a su lista de compras."),
        variant: "destructive",
      });
      navigate("/profile");
      return Promise.reject(new Error("User not signed in"));
    }
    
    try {
      console.log('Adding scanned product to list:', product);
      
      // Get the default list or create one if it doesn't exist
      const defaultList = await getOrCreateDefaultList(user.id);
      console.log('Default list for scanned product:', defaultList);
      
      // Add the product to the list
      const result = await addProductToGroceryList(defaultList.id, user.id, product);
      console.log('Result of adding scanned product:', result);
      
      if (!result.success) {
        toast({
          title: translateUI("Error"),
          description: result.message ? translateUI(result.message) : translateUI("No se pudo agregar el producto a la lista"),
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists with the product ID directly
      setProductsInList(prev => new Set([...prev, product.id]));
      
      toast({
        title: translateUI("Agregado a la lista"),
        description: translateUI(`${product.name || 'Producto'} agregado a ${defaultList.name}`),
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding scanned product to list:', error);
      return Promise.reject(error);
    }
  };

  // Filter results by store if needed
  const filteredResults = useMemo(() => {
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results to filter');
      return [];
    }
    
    console.log(`Filtering search results, total: ${searchResults.length}, filter: ${storeFilter}`);
    
    // Count products by store for debugging
    const storeGroups = {
      Walmart: 0,
      MaxiPali: 0,
      MasxMenos: 0,
      Other: 0
    };
    
    // Perform store counts for debugging
    searchResults.forEach(product => {
      const store = String(product.store || '').trim();
      if (store === 'Walmart') storeGroups.Walmart++;
      else if (store === 'MaxiPali') storeGroups.MaxiPali++;
      else if (store === 'MasxMenos') storeGroups.MasxMenos++;
      else storeGroups.Other++;
    });
    
    console.log('Store distribution:', storeGroups);
    
    // Apply store filter
    let results = searchResults;
    
    if (storeFilter !== 'all') {
      console.log(`Applying filter for store: "${storeFilter}"`);
      
      // Create a more robust filtering function
      results = searchResults.filter(product => {
        // Make sure product has store property
        if (!product || !product.store) {
          console.warn('Product missing store property:', product?.id);
          return false;
        }
        
        // Direct equality comparison for store names - they should be consistent
        if (product.store === storeFilter) {
          return true;
        }
        
        // Fallback to normalized comparison if direct match fails
        const normalizedProductStore = String(product.store)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '');
          
        const normalizedFilterStore = String(storeFilter)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '');
          
        const isMatch = normalizedProductStore === normalizedFilterStore;
        
        // For debugging
        if (!isMatch && product.store === storeFilter) {
          console.warn(`Store mismatch despite text equality: '${product.store}' vs '${storeFilter}'`, 
            { normalizedProductStore, normalizedFilterStore });
        }
        
        return isMatch;
      });
      
      console.log(`After filtering for ${storeFilter}, ${results.length} products remain`);
      
      // Additional debug - examine a sampling of the filtered products
      if (results.length > 0) {
        console.log('Sample of filtered products:');
        results.slice(0, 3).forEach(p => {
          console.log(`Product ID: ${p.id}, Name: ${p.name}, Store: ${p.store}`);
        });
      }
      
      // Debug if no results match
      if (results.length === 0) {
        console.warn(`No products found for store filter: ${storeFilter}`);
        console.warn('Available stores in results:', [...new Set(searchResults.map(p => p.store))]);
        
        // Debug the first few products to see store format
        searchResults.slice(0, 5).forEach(p => 
          console.log(`Product store: "${p.store}" (${typeof p.store}), id: ${p.id}`)
        );
      }
    }
    
    // Sort results by relevance
    const sortedResults = sortProductsByRelevance(results, query);
    console.log(`After sorting, returned ${sortedResults.length} products for display`);
    
    return sortedResults;
  }, [searchResults, storeFilter, query]);

  // Debug effect for filtered results
  useEffect(() => {
    if (filteredResults && filteredResults.length > 0) {
      console.log('Current filter:', storeFilter);
      console.log('Product count to be displayed:', filteredResults.length);
      console.log('Store counts in filteredResults:', {
        'Walmart': filteredResults.filter(p => p.store === 'Walmart').length,
        'MaxiPali': filteredResults.filter(p => p.store === 'MaxiPali').length,
        'MasxMenos': filteredResults.filter(p => p.store === 'MasxMenos').length
      });
    }
  }, [filteredResults, storeFilter]);

  // Handler for changing store filter
  const handleStoreFilterChange = (value: string) => {
    console.log(`Changing store filter from ${storeFilter} to ${value}`);
    
    // Set the new filter value
    setStoreFilter(value as 'all' | 'MaxiPali' | 'MasxMenos' | 'Walmart');
    
    // Debug expected count from newly selected filter
    if (value !== 'all' && searchResults.length > 0) {
      const expectedCount = searchResults.filter(p => 
        String(p.store).trim().toLowerCase() === value.toLowerCase()
      ).length;
      
      console.log(`Selected filter: ${value}. Expected products matching this filter: ${expectedCount}`);
      
      // Check case sensitivity issues
      const exactMatches = searchResults.filter(p => p.store === value).length;
      if (exactMatches !== expectedCount) {
        console.warn(`Store case sensitivity issue detected. Exact matches: ${exactMatches}, 
                     Case-insensitive matches: ${expectedCount}`);
      }
    }
    
    // Provide user feedback via toast if appropriate
    if (value !== 'all') {
      const storeCount = searchResults.filter(p => p.store === value).length;
      if (storeCount === 0) {
        toast({
          title: translateUI("No hay productos"),
          description: translateUI(`No hay productos de ${value} para "${query}"`),
          variant: "default",
        });
      }
    }
  };

  return (
    <div className="w-full">
      {/* Header section with max-width */}
      <div className="max-w-2xl mx-auto text-center mb-8 px-4 w-full">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          <TranslatedText es="Comparar Precios, Ahorrar Dinero" en="Compare Prices, Save Money" />
        </h1>
        <p className="text-muted-foreground text-lg">
          <TranslatedText es="Encuentra las mejores ofertas de supermercados en MaxiPali, MasxMenos y Walmart" en="Find the best grocery deals at MaxiPali, MasxMenos, and Walmart" />
        </p>
      </div>

      {/* Search bar section with max-width */}
      <div className="max-w-xl mx-auto mb-12 px-4 w-full">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar 
              initialQuery={query} 
              onSearch={handleSearch} 
              expanded 
              onQueryChange={setQuery}
              isSearching={isSearching}
            />
          </div>
          <Button 
            onClick={() => setIsScannerOpen(true)} 
            variant="outline"
            className="rounded-full h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-primary"
            aria-label={translateUI("Escanear código de barras")}
          >
            <Scan className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Full width search results section */}
      {query ? (
        <div className="w-full px-4" style={{ maxWidth: "100%" }}>
          <div className="w-full mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-medium">
                {isSearching ? (
                  <TranslatedText es="Buscando..." en="Searching..." />
                ) : searchResults.length > 0 ? (
                  <TranslatedText 
                    es={`Se encontraron ${storeFilter === 'all' ? searchResults.length : filteredResults.length} resultados para "${query}" ${storeFilter !== 'all' ? `en ${storeFilter}` : ''}`}
                    en={`Found ${storeFilter === 'all' ? searchResults.length : filteredResults.length} results for "${query}" ${storeFilter !== 'all' ? `in ${storeFilter}` : ''}`}
                  />
                ) : (
                  <TranslatedText 
                    es={`No hay resultados para "${query}"`}
                    en={`No results for "${query}"`}
                  />
                )}
              </h2>
              
              {searchResults.length > 0 && !isSearching && (
                <Tabs 
                  value={storeFilter} 
                  onValueChange={(value) => {
                    console.log(`Tab selection changed to: ${value}`);
                    handleStoreFilterChange(value);
                  }}
                  className="w-full"
                  defaultValue="all"
                >
                  <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full gap-1 p-1.5 md:flex md:w-auto">
                    <TabsTrigger 
                      value="all"
                      className={`px-3 py-2 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        storeFilter === 'all' 
                          ? 'font-semibold bg-gray-100 dark:bg-gray-800' 
                          : 'bg-white/80 dark:bg-gray-900/30'
                      }`}
                    >
                      <TranslatedText es="Todas las Tiendas" en="All Stores" /> 
                      <span className="ml-1 text-xs">({searchResults.length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="MaxiPali"
                      className={`px-3 py-2 text-center hover:bg-yellow-50 dark:hover:bg-yellow-900/30 ${
                        storeFilter === 'MaxiPali' 
                          ? 'font-semibold bg-yellow-100 dark:bg-yellow-900/40' 
                          : 'bg-white/80 dark:bg-gray-900/30'
                      }`}
                    >
                      MaxiPali
                      <span className="ml-1 text-xs">({searchResults.filter(p => p.store === 'MaxiPali').length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="MasxMenos"
                      className={`px-3 py-2 text-center hover:bg-green-50 dark:hover:bg-green-900/30 ${
                        storeFilter === 'MasxMenos' 
                          ? 'font-semibold bg-green-100 dark:bg-green-900/40' 
                          : 'bg-white/80 dark:bg-gray-900/30'
                      }`}
                    >
                      MasxMenos
                      <span className="ml-1 text-xs">({searchResults.filter(p => p.store === 'MasxMenos').length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Walmart"
                      className={`px-3 py-2 text-center hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                        storeFilter === 'Walmart' 
                          ? 'font-semibold bg-blue-100 dark:bg-blue-900/40' 
                          : 'bg-white/80 dark:bg-gray-900/30'
                      }`}
                    >
                      Walmart
                      <span className="ml-1 text-xs">({searchResults.filter(p => p.store === 'Walmart').length})</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </div>

          {isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4" style={{ width: "100%", maxWidth: "100%" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredResults && filteredResults.length > 0 ? (
            <div style={{ width: "100%", maxWidth: "100%" }}>
              {storeFilter !== 'all' && (
                <div className={`mb-4 py-2 px-4 rounded-lg border flex items-center justify-between
                  ${storeFilter === 'Walmart' ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 
                   storeFilter === 'MaxiPali' ? 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' : 
                   storeFilter === 'MasxMenos' ? 'bg-green-50 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : 
                   'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
                  }`}>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2
                      ${storeFilter === 'Walmart' ? 'bg-blue-600' : 
                       storeFilter === 'MaxiPali' ? 'bg-yellow-500' : 
                       storeFilter === 'MasxMenos' ? 'bg-green-600' : 
                       'bg-gray-500'
                      }`}></div>
                    <span className="font-medium">
                      <TranslatedText 
                        es={`Mostrando solo productos de ${storeFilter}`}
                        en={`Showing only ${storeFilter} products`}
                      />
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleStoreFilterChange('all')}
                    className="text-xs">
                    <TranslatedText es="Ver todas las tiendas" en="View all stores" />
                  </Button>
                </div>
              )}
              <ProductGrid
                products={filteredResults}
                onAddToList={handleAddToList}
                isProductInList={isProductInList}
              />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-muted mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">
                <TranslatedText es="Ningún producto coincide con el filtro actual" en="No products match the current filter" />
              </h3>
              <p className="text-muted-foreground">
                <TranslatedText es="Intenta cambiar el filtro de tienda para ver más resultados" en="Try changing the store filter to see more results" />
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStoreFilter('all')}
                  className="mx-auto"
                >
                  <TranslatedText es="Mostrar todas las tiendas" en="Show all stores" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-muted mb-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">
                <TranslatedText es="No se encontraron resultados" en="No results found" />
              </h3>
              <p className="text-muted-foreground">
                <TranslatedText 
                  es="Intenta ajustar tu término de búsqueda o prueba con una palabra clave diferente" 
                  en="Try adjusting your search term or try a different keyword" 
                />
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <section>
            <h2 className="section-title">
              <TranslatedText es="Tiendas Destacadas" en="Featured Store" />
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {stores.map((store) => (
                <div 
                  key={store.id}
                  className="glass-card p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-md"
                  style={{ borderTop: `3px solid ${store.color}` }}
                >
                  <div className="h-12 mb-2 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span 
                        className="text-2xl font-bold"
                        style={{ color: store.color }}
                      >
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium">{store.name}</h3>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="section-title">
              <TranslatedText es="Productos Populares" en="Popular Products" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="text-center py-12 col-span-full">
                <p className="text-muted-foreground">
                  <TranslatedText 
                    es="Busca productos para comenzar a comparar precios"
                    en="Search for products to start comparing prices" 
                  />
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAddProduct={handleAddScannedProduct}
      />
    </div>
  );
};

export default Index;
