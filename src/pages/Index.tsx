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
        // Make sure store field is set correctly
        const maxiPaliWithStore = maxiPaliResults.products.map(p => ({
          ...p,
          store: 'MaxiPali' as const
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
        // Make sure store field is set correctly
        const masxMenosWithStore = masxMenosResults.products.map(p => ({
          ...p,
          store: 'MasxMenos' as const
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
        // Make sure store field is set correctly
        const walmartWithStore = walmartResults.products.map(p => ({
          ...p,
          store: 'Walmart' as const
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
    
    // If there are Walmart products, log them to verify
    const walmartProducts = searchResults.filter(product => product.store === 'Walmart');
    const maxiPaliProducts = searchResults.filter(product => product.store === 'MaxiPali');
    const masxMenosProducts = searchResults.filter(product => product.store === 'MasxMenos');
    
    console.log(`Current search results by store: Walmart=${walmartProducts.length}, MaxiPali=${maxiPaliProducts.length}, MasxMenos=${masxMenosProducts.length}`);
    
    if (walmartProducts.length > 0) {
      console.log('First Walmart product:', walmartProducts[0]);
    } else {
      console.warn('No Walmart products found in search results');
    }
    
    // Apply store filter
    let results = searchResults;
    
    if (storeFilter !== 'all') {
      results = searchResults.filter(product => {
        // Handle undefined store or malformed data
        if (!product.store) {
          console.error('Product missing store property:', product);
          return false;
        }
        
        // Direct comparison
        const storeMatches = product.store === storeFilter;
        return storeMatches;
      });
    }
      
    console.log(`After filtering, ${results.length} products remain, filter: ${storeFilter}`);
    
    // Sort results by relevance
    const sortedResults = sortProductsByRelevance(results, query);
    console.log(`After sorting, returned ${sortedResults.length} products for display`);
    
    return sortedResults;
  }, [searchResults, storeFilter, query]);

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto text-center mb-8 animate-fade-up">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          <TranslatedText es="Comparar Precios, Ahorrar Dinero" en="Compare Prices, Save Money" />
        </h1>
        <p className="text-muted-foreground text-lg">
          <TranslatedText es="Encuentra las mejores ofertas de supermercados en MaxiPali, MasxMenos y Walmart" en="Find the best grocery deals at MaxiPali, MasxMenos, and Walmart" />
        </p>
      </div>

      <div className="max-w-xl mx-auto mb-12 animate-fade-up animate-delay-100">
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

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAddProduct={handleAddScannedProduct}
      />

      {query ? (
        <div className="space-y-6" ref={searchResultsRef}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-medium">
              {isSearching ? (
                <TranslatedText es="Buscando..." en="Searching..." />
              ) : searchResults.length > 0 ? (
                <TranslatedText 
                  es={`Se encontraron ${searchResults.length} resultados para "${query}"`}
                  en={`Found ${searchResults.length} results for "${query}"`}
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
                onValueChange={(value) => setStoreFilter(value as 'all' | 'MaxiPali' | 'MasxMenos' | 'Walmart')}
                className="w-full md:w-auto"
              >
                <TabsList className="grid grid-cols-4 w-full md:w-auto">
                  <TabsTrigger value="all"><TranslatedText es="Todas las Tiendas" en="All Stores" /></TabsTrigger>
                  <TabsTrigger value="MaxiPali">MaxiPali</TabsTrigger>
                  <TabsTrigger value="MasxMenos">MasxMenos</TabsTrigger>
                  <TabsTrigger value="Walmart">Walmart</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredResults && filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredResults.map((product, index) => (
                <ProductCard 
                  key={`${product.id}-${product.store}-${index}`}  
                  product={product} 
                  isInList={isProductInList(product.id, product.store || '')}
                  onAddToList={handleAddToList}
                  index={index}
                />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            // Display this when there are search results but filtered results is empty
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
        <div className="space-y-12 animate-fade-up animate-delay-200">
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
    </div>
  );
};

export default Index;
