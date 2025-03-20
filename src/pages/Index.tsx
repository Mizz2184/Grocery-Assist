import { useState, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { mockGroceryLists } from "@/utils/productData";
import { stores } from "@/utils/storeData";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search as SearchIcon, Scan } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { searchMaxiPaliProducts } from "@/lib/services";
import { addProductToGroceryList, getOrCreateDefaultList, getUserGroceryLists } from "@/lib/services/groceryListService";
import { Product } from "@/lib/types/store";
import { Button } from "@/components/ui/button";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

const Index = () => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [productsInList, setProductsInList] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim() === '') {
      toast({
        title: "Empty search",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }
    
    setQuery(searchQuery);
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      console.log('Starting search for:', searchQuery);
      const maxiPaliResults = await searchMaxiPaliProducts({ query: searchQuery });
      
      if (!maxiPaliResults.products) {
        toast({
          title: "Search Error",
          description: "Server is temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      if (maxiPaliResults.products.length === 0) {
        toast({
          title: "No products found",
          description: "Try a different search term or check your connection",
        });
      } else {
        console.log(`Found ${maxiPaliResults.products.length} products`);
      }
      
      setSearchResults(maxiPaliResults.products);
    } catch (error: any) {
      console.error('Error searching products:', error);
      toast({
        title: "Search Error",
        description: "Failed to connect to the search service. Please try again later.",
        variant: "destructive",
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

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto text-center mb-8 animate-fade-up">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          Compare Prices, Save Money
        </h1>
        <p className="text-muted-foreground text-lg">
          Find the best grocery deals at MaxiPali
        </p>
      </div>

      <div className="max-w-xl mx-auto mb-12 animate-fade-up animate-delay-100">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} expanded />
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">
              {isSearching ? (
                "Searching..."
              ) : searchResults.length > 0 ? (
                `Found ${searchResults.length} results for "${query}"`
              ) : (
                `No results for "${query}"`
              )}
            </h2>
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
              {searchResults.map((product, index) => (
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
