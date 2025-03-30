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
      const [maxiPaliResults, masxMenosResults, walmartResults] = await Promise.all([
        searchMaxiPaliProducts({ query: searchQuery }),
        searchMasxMenosProducts({ query: searchQuery }),
        searchWalmartProducts({ query: searchQuery })
      ]);

      let combinedResults: Product[] = [];
      let totalProductCount = 0;
      
      // Add MaxiPali results
      if (maxiPaliResults.products && maxiPaliResults.products.length > 0) {
        combinedResults = [...combinedResults, ...maxiPaliResults.products];
        totalProductCount += maxiPaliResults.products.length;
        console.log(`Found ${maxiPaliResults.products.length} MaxiPali products`);
      }
      
      // Add MasxMenos results
      if (masxMenosResults.products && masxMenosResults.products.length > 0) {
        // Add MasxMenos results directly without additional filtering
        combinedResults = [...combinedResults, ...masxMenosResults.products];
        totalProductCount += masxMenosResults.products.length;
        console.log(`Found ${masxMenosResults.products.length} MasxMenos products`);
      }
      
      // Add Walmart results
      if (walmartResults.products && walmartResults.products.length > 0) {
        // Add Walmart results directly without additional filtering
        combinedResults = [...combinedResults, ...walmartResults.products];
        totalProductCount += walmartResults.products.length;
        console.log(`Found ${walmartResults.products.length} Walmart products`);
      }
      
      // If both searches failed or returned no results
      if (combinedResults.length === 0) {
        toast({
          title: "No Results Found",
          description: `We couldn't find any products matching "${searchQuery}"`,
          variant: "destructive"
        });
      } else {
        console.log(`Found ${combinedResults.length} total products`);
        toast({
          title: `Found ${totalProductCount} Products`,
          description: `Showing results for "${searchQuery}"`
        });
        setSearchResults(combinedResults);
      }
    } catch (error) {
      console.error('Error during search:', error);
      toast({
        title: "Search Error",
        description: "An error occurred during the search. Please try again.",
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
          title: "Sign in required",
          description: "Please sign in to add items to your grocery list.",
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
          title: "Error",
          description: "Could not find product details",
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
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists - use the ID directly
      setProductsInList(prev => new Set([...prev, product.id]));
      
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
      console.log('Adding scanned product to list:', product);
      
      // Get the default list or create one if it doesn't exist
      const defaultList = await getOrCreateDefaultList(user.id);
      console.log('Default list for scanned product:', defaultList);
      
      // Add the product to the list
      const result = await addProductToGroceryList(defaultList.id, user.id, product);
      console.log('Result of adding scanned product:', result);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
        });
        return Promise.reject(new Error(result.message));
      }
      
      // Update the list of products in user's lists with the product ID directly
      setProductsInList(prev => new Set([...prev, product.id]));
      
      toast({
        title: "Added to list",
        description: `${product.name || 'Product'} added to ${defaultList.name}`,
      });
      
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
      } else if (normalizedStore?.includes('Walmart') || normalizedStore === 'Walmart') {
        normalizedStore = 'Walmart';
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
          Find the best grocery deals at MaxiPali, MasxMenos, and Walmart
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
                onValueChange={(value) => setStoreFilter(value as 'all' | 'MaxiPali' | 'MasxMenos' | 'Walmart')}
                className="w-full md:w-auto"
              >
                <TabsList className="grid grid-cols-4 w-full md:w-auto">
                  <TabsTrigger value="all">All Stores</TabsTrigger>
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
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredResults.map((product, index) => (
                <ProductCard 
                  key={`${product.id}-${index}`} 
                  product={product} 
                  isInList={isProductInList(product.id, product.store || '')}
                  onAddToList={handleAddToList}
                  index={index}
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
