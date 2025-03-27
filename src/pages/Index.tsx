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
import { searchMaxiPaliProducts, searchMasxMenosProducts } from "@/lib/services";
import { addProductToGroceryList, getOrCreateDefaultList, getUserGroceryLists } from "@/lib/services/groceryListService";
import { Product } from "@/lib/types/store";
import { Button } from "@/components/ui/button";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { 
    query, setQuery,
    searchResults, setSearchResults,
    scrollPosition, setScrollPosition,
    isSearching, setIsSearching
  } = useSearch();
  const [productsInList, setProductsInList] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState<'all' | 'MaxiPali' | 'MasxMenos'>('all');
  const [showBanner, setShowBanner] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchResultsRef = useRef<HTMLDivElement>(null);

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
        return;
      }

      try {
        const lists = await getUserGroceryLists(user.id);
        const productIds = new Set<string>();
        
        lists.forEach(list => {
          list.items.forEach(item => {
            productIds.add(item.productId);
          });
        });
        
        setProductsInList(productIds);
      } catch (error) {
        console.error('Error fetching user lists:', error);
      }
    };
    
    fetchUserLists();
  }, [user]);

  // Check if product is in any grocery list
  const isProductInList = (productId: string) => {
    return productsInList.has(productId);
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
    if (!searchQuery || searchQuery.trim() === '') {
      toast({
        title: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }
    
    const normalizedQuery = searchQuery.trim().toLowerCase();
    setQuery(searchQuery);
    setIsSearching(true);
    setSearchResults([]);
    setScrollPosition(0); // Reset scroll position for new search
    
    try {
      console.log('Starting search for:', searchQuery);
      
      // Search in both MaxiPali and MasxMenos
      const [maxiPaliResults, masxMenosResults] = await Promise.allSettled([
        searchMaxiPaliProducts({ query: searchQuery }),
        searchMasxMenosProducts({ query: searchQuery })
      ]);
      
      // Initialize an array to hold combined results
      let combinedResults: Product[] = [];
      let totalProductCount = 0;
      
      // Handle MaxiPali results
      if (maxiPaliResults.status === 'fulfilled' && maxiPaliResults.value.products) {
        // Additional filtering to ensure relevance
        const filteredMaxiPaliResults = maxiPaliResults.value.products.filter(product => {
          const searchTerms = normalizedQuery.split(/\s+/);
          const productName = product.name.toLowerCase();
          const brand = (product.brand || '').toLowerCase();
          const category = (product.category || '').toLowerCase();
          
          // Check if any search term matches the product
          return searchTerms.some(term => {
            // Skip empty terms
            if (!term) return false;
            
            // Check for exact matches first
            if (productName.includes(term) || 
                brand.includes(term) || 
                category.includes(term) ||
                (product.ean && product.ean === searchQuery)) {
              return true;
            }
            
            // For terms longer than 2 characters, also check for partial matches
            if (term.length > 2) {
              return productName.includes(term) || 
                     brand.includes(term) || 
                     category.includes(term);
            }
            
            return false;
          });
        });
        
        combinedResults = [...filteredMaxiPaliResults];
        totalProductCount += filteredMaxiPaliResults.length;
        console.log(`Found ${maxiPaliResults.value.products.length} MaxiPali products, filtered to ${filteredMaxiPaliResults.length}`);
      } else if (maxiPaliResults.status === 'rejected') {
        console.error('MaxiPali search error:', maxiPaliResults.reason);
      }
      
      // Handle MasxMenos results
      if (masxMenosResults.status === 'fulfilled' && masxMenosResults.value.products) {
        // Add MasxMenos results directly without additional filtering
        combinedResults = [...combinedResults, ...masxMenosResults.value.products];
        totalProductCount += masxMenosResults.value.products.length;
        console.log(`Found ${masxMenosResults.value.products.length} MasxMenos products`);
      } else if (masxMenosResults.status === 'rejected') {
        console.error('MasxMenos search error:', masxMenosResults.reason);
      }
      
      // If both searches failed or returned no results
      if (combinedResults.length === 0) {
        if (maxiPaliResults.status === 'rejected' && masxMenosResults.status === 'rejected') {
          toast({
            title: "Search Error",
            description: "Failed to connect to search services. Please try again later.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "No products found",
            description: "Try a different search term or check your connection",
          });
        }
      } else {
        // Sort by relevance if search query is provided
        const sortedResults = sortProductsByRelevance(combinedResults, normalizedQuery);
        setSearchResults(sortedResults);
        setShowBanner(false);
        
        toast({
          title: `Found ${totalProductCount} products`,
          description: storeFilter === 'all' 
            ? "Showing results from all stores" 
            : `Showing results from ${storeFilter}`
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToList = async (productId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your grocery list.",
        variant: "destructive",
      });
      navigate("/profile");
      return Promise.reject(new Error("User not signed in"));
    }
    
    try {
      // Find the product in our search results
      const product = searchResults.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found in search results');
      }
      
      // Get the default list or create one if it doesn't exist
      const defaultList = await getOrCreateDefaultList(user.id);
      
      // Add the product to the list
      const result = await addProductToGroceryList(defaultList.id, user.id, product);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists
      setProductsInList(prev => new Set([...prev, productId]));
      
      toast({
        title: "Added to list",
        description: `${product.name || 'Product'} added to ${defaultList.name}`,
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding product to list:', error);
      toast({
        title: "Error",
        description: "Failed to add product to your list",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };
  
  const handleAddScannedProduct = async (product: Product) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your grocery list.",
        variant: "destructive",
      });
      navigate("/profile");
      return Promise.reject(new Error("User not signed in"));
    }
    
    try {
      // Get the default list or create one if it doesn't exist
      const defaultList = await getOrCreateDefaultList(user.id);
      
      // Add the product to the list
      const result = await addProductToGroceryList(defaultList.id, user.id, product);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists
      setProductsInList(prev => new Set([...prev, product.id]));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding scanned product to list:', error);
      return Promise.reject(error);
    }
  };

  // Filter products by selected store if needed
  const filteredResults = useMemo(() => {
    if (storeFilter === 'all') {
      return searchResults;
    }
    
    return searchResults.filter(product => {
      // Normalize store name for consistent filtering
      let normalizedStore = product.store;
      if (normalizedStore?.includes('MaxiPali') || normalizedStore === 'MaxiPali') {
        normalizedStore = 'MaxiPali';
      } else if (normalizedStore?.includes('MasxMenos') || normalizedStore === 'MasxMenos') {
        normalizedStore = 'MasxMenos';
      }
      
      return normalizedStore === storeFilter;
    });
  }, [searchResults, storeFilter]);

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto text-center mb-8 animate-fade-up">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          Compare Prices, Save Money
        </h1>
        <p className="text-muted-foreground text-lg">
          Find the best grocery deals at MaxiPali and MasxMenos
        </p>
      </div>

      <div className="max-w-xl mx-auto mb-12 animate-fade-up animate-delay-100">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar initialQuery={query} onSearch={handleSearch} expanded />
          </div>
          <Button 
            onClick={() => setIsScannerOpen(true)} 
            variant="outline"
            className="rounded-full h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-primary"
            aria-label="Scan barcode"
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
                "Searching..."
              ) : searchResults.length > 0 ? (
                `Found ${searchResults.length} results for "${query}"`
              ) : (
                `No results for "${query}"`
              )}
            </h2>
            
            {searchResults.length > 0 && !isSearching && (
              <Tabs 
                value={storeFilter} 
                onValueChange={(value) => setStoreFilter(value as 'all' | 'MaxiPali' | 'MasxMenos')}
                className="w-full md:w-auto"
              >
                <TabsList className="grid grid-cols-3 w-full md:w-auto">
                  <TabsTrigger value="all">All Stores</TabsTrigger>
                  <TabsTrigger value="MaxiPali">MaxiPali</TabsTrigger>
                  <TabsTrigger value="MasxMenos">MasxMenos</TabsTrigger>
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
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredResults.map((product, index) => (
                <ProductCard 
                  key={`${product.id}-${index}`} 
                  product={product} 
                  isInList={isProductInList(product.id)}
                  onAddToList={handleAddToList}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-muted mb-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search term or try a different keyword
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 animate-fade-up animate-delay-200">
          <section>
            <h2 className="section-title">Featured Store</h2>
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
            <h2 className="section-title">Popular Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="text-center py-12 col-span-full">
                <p className="text-muted-foreground">
                  Search for products to start comparing prices
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
