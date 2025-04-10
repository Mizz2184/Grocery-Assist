import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { 
  getOrCreateDefaultList, 
  addProductToGroceryList,
  syncGroceryListToDatabase,
  getUserGroceryLists 
} from '@/lib/services/groceryListService';
import { Product } from "@/lib/types/store";
import { Button } from "@/components/ui/button";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from "@/context/TranslationContext";
import { TranslatedText } from "@/App";
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getProductStore, STORE } from '@/utils/storeUtils';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGroceryList } from "@/hooks/useGroceryList";
import { Card, CardFooter, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { CRC_TO_USD_RATE, convertCRCtoUSD } from "@/utils/currencyUtils";
import { formatPrice } from "@/lib/utils/currency";

interface ProductGridProps {
  products: Product[];
  onAddToList: (product: Product) => Promise<void>;
  isProductInList: (productId: string, store?: string) => boolean;
}

const ProductGrid = ({ products, onAddToList, isProductInList }: ProductGridProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCardComponent
          key={`${product.store || 'unknown'}-${product.id}`}
          product={product}
          onAddToList={onAddToList}
          isInList={isProductInList(product.id, product.store)}
        />
      ))}
    </div>
  );
};

// Add store colors constant at the top with other constants
const STORE_COLORS = {
  'Walmart': { bg: '#0071ce', text: '#fff' },
  'MaxiPali': { bg: '#ffde00', text: '#000' },
  'MasxMenos': { bg: '#0001ab', text: '#fff' }
};

interface ProductCardProps {
  product: Product;
  onAddToList: (product: Product) => Promise<void>;
  isInList: boolean;
}

const ProductCardComponent = ({ product, onAddToList, isInList }: ProductCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const storeColors = product.store ? STORE_COLORS[product.store as keyof typeof STORE_COLORS] : undefined;
  
  return (
    <>
      <Card 
        className="h-full flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="pt-6">
          <div className="aspect-square relative mb-3">
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
              alt={product.name}
                fill
                className="object-contain"
              />
            )}
          </div>
          <div className="space-y-1 text-sm">
            <h3 className="font-medium leading-none">{product.name}</h3>
            {product.brand && (
              <p className="text-xs text-muted-foreground">{product.brand}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {formatPrice(product.price)}
              </p>
              {product.store && (
                <Badge 
                  variant="secondary" 
                  style={storeColors ? {
                    backgroundColor: storeColors.bg,
                    color: storeColors.text,
                    border: 'none'
                  } : undefined}
                >
                {product.store}
                </Badge>
              )}
              </div>
            </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAddToList(product);
            }}
            disabled={isInList}
            className="w-full"
          >
            {isInList ? 'In List' : 'Add to List'}
          </Button>
        </CardFooter>
      </Card>

      {showDetail && (
        <ProductDetailModal
          product={product}
          onClose={() => setShowDetail(false)}
          onAddToList={async (quantity) => {
            await onAddToList({ ...product, quantity });
            setShowDetail(false);
          }}
          isInList={isInList}
        />
      )}
    </>
  );
};

const ProductDetailModal = ({ 
  product, 
  onClose, 
  onAddToList, 
  isInList 
}: { 
  product: Product, 
  onClose: () => void, 
  onAddToList: (quantity: number) => Promise<void>,
  isInList: boolean
}) => {
  const [quantity, setQuantity] = useState(1);
  const totalPrice = product.price * quantity;
  const usdPrice = convertCRCtoUSD(totalPrice); // Using the imported exchange rate function

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product.store && (
              <Badge 
                variant="secondary"
                style={product.store && STORE_COLORS[product.store as keyof typeof STORE_COLORS] ? {
                  backgroundColor: STORE_COLORS[product.store as keyof typeof STORE_COLORS].bg,
                  color: STORE_COLORS[product.store as keyof typeof STORE_COLORS].text,
                  border: 'none'
                } : undefined}
              >
                {product.store}
              </Badge>
            )}
            {product.brand && <span>{product.brand}</span>}
            </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center">
          <div className="w-full max-h-52 overflow-hidden mb-4 flex justify-center">
            <img 
              src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
              alt={product.name}
              className="h-full object-contain"
            />
          </div>
          
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xl font-semibold">
                  {formatPrice(product.price)}
                </div>
                <div className="text-sm text-muted-foreground">
                  ${convertCRCtoUSD(product.price).toFixed(2)} USD
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  <TranslatedText es="Cantidad:" en="Quantity:" />
                </span>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Total:</span>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {formatPrice(totalPrice)}
                  </div>
                <div className="text-sm text-muted-foreground">
                    ${usdPrice.toFixed(2)} USD
                </div>
            </div>
          </div>
        </div>
    </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <TranslatedText es="Cancelar" en="Cancel" />
          </Button>
          <Button
            onClick={() => onAddToList(quantity)}
            disabled={isInList}
            className="flex-1"
          >
            {isInList ? (
              <TranslatedText es="Ya agregado" en="Already Added" />
            ) : (
              <TranslatedText es="Agregar a la lista" en="Add to List" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { activeList, setActiveList } = useGroceryList();
  const [addingToList, setAddingToList] = useState(false);

  const featuredStores = [
    {
      name: "Walmart",
      logo: "https://walmartcr.vtexassets.com/assets/vtex/assets-builder/walmartcr.store-theme/1.0.547/waltmart-logo___79b22f9300425be6191803c2f8b8b9df.svg"
    },
    {
      name: "MaxiPali",
      logo: "https://bodegacr.vtexassets.com/assets/vtex.file-manager-graphql/images/a0702460-0ef6-4229-a043-205b7e14d9b1___e839333af8652e1fb779b647b5e69d82.svg"
    },
    {
      name: "MasxMenos",
      logo: "https://supermxmcr.vtexassets.com/assets/vtex.file-manager-graphql/images/3ded2a1c-d612-4f03-8a2b-45ed6cbc7ca4___cfba4950414c4e5734e110da25e4900b.svg"
    }
  ];

  const scrollToSearchBar = useCallback(() => {
    if (searchBarRef.current) {
      // Get the element's position relative to the viewport
      const rect = searchBarRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Calculate the absolute position
      const absoluteY = rect.top + scrollTop;
      
      // Add offset for mobile header/navigation
      const offset = window.innerWidth <= 768 ? 80 : 20;
      
      // Scroll to position
      window.scrollTo({
        top: absoluteY - offset,
        behavior: 'smooth'
      });
      
      // Add a highlight effect
      searchBarRef.current.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      
      // Focus the search input after scrolling
      setTimeout(() => {
        const searchInput = searchBarRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 500);
      
      // Remove the highlight effect after animation
      setTimeout(() => {
        if (searchBarRef.current) {
          searchBarRef.current.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }
      }, 2000);
    }
  }, []);

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
    // New implementation: Find the actual product in active lists
    try {
      // First check our local state for a faster response
      if (productsInList.has(productId)) {
        console.log(`isProductInList: Found product ${productId} in productsInList Set`);
        return true;
      }
      
      const allLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const productStore = store ? store : STORE.UNKNOWN;
      
      // Look for both product ID and store match
      for (const list of allLists) {
        if (!list.items) continue;
        
        for (const item of list.items) {
          if (item.productId === productId) {
            // We found a product with matching ID
            console.log(`isProductInList: Found product ${productId} in localStorage lists`);
            
            // Add to our Set for faster lookup next time
            setProductsInList(prev => new Set([...prev, productId]));
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if product is in list:', error);
      // Fall back to previous behavior
      return productsInList.has(productId);
    }
  };

  // Update search ranking to use name, brand, and description
  const rankSearchResults = (results: Product[], term: string): Product[] => {
    const termLower = term.toLowerCase();
    
    return [...results].sort((a, b) => {
      let aScore = 0;
      let bScore = 0;
      
      // Exact name match is most important
      if (a.name.toLowerCase() === termLower) aScore += 10;
      if (b.name.toLowerCase() === termLower) bScore += 10;
      
      // Name contains term is next most important
      if (a.name.toLowerCase().includes(termLower)) aScore += 5;
      if (b.name.toLowerCase().includes(termLower)) bScore += 5;
      
      // Brand match is next most important
      if ((a.brand || '').toLowerCase().includes(termLower)) aScore += 3;
      if ((b.brand || '').toLowerCase().includes(termLower)) bScore += 3;
      
      // Description match is least important
      if ((a.description || '').toLowerCase().includes(termLower)) aScore += 1;
      if ((b.description || '').toLowerCase().includes(termLower)) bScore += 1;
      
      return bScore - aScore;
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

  const handleAddToList = async (product: Product) => {
      if (!user) {
        toast({
        title: "Error",
        description: "Please log in to add products to your list",
          variant: "destructive",
        });
      return;
      }
      
    // Ensure we have the most current activeList
    const currentActiveList = useGroceryList.getState().activeList;
      
    if (!currentActiveList) {
        toast({
        title: "No List Selected",
        description: "Please select or create a grocery list first",
          variant: "destructive",
        });
      navigate('/grocery-list');
      return;
    }

    try {
      setAddingToList(true);

      // Ensure store information is preserved and set default quantity if not provided
      const productToAdd = {
        ...product,
        store: product.store || getProductStore(product),
        quantity: product.quantity || 1
      };

      const result = await addProductToGroceryList(
        currentActiveList.id,
        user.id,
        productToAdd
      );

      if (result.success) {
        // Add the product ID to the productsInList Set
        setProductsInList(prev => new Set([...prev, product.id]));
        
        // Update the local storage to reflect the change immediately
        const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
        const updatedLists = lists.map((list: any) => {
          if (list.id === currentActiveList.id) {
            return {
              ...list,
              items: [...(list.items || []), {
              productId: product.id,
                quantity: productToAdd.quantity,
                productData: productToAdd
              }]
            };
          }
          return list;
        });
        localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
        
        toast({
          title: "Added to List",
          description: `${product.name} has been added to ${currentActiveList.name}`,
        });
      } else {
      toast({
          title: "Error",
          description: result.message || "Failed to add product to list",
          variant: "destructive",
      });
      }
    } catch (error) {
      console.error('Error adding product to list:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the product to your list",
        variant: "destructive",
      });
    } finally {
      setAddingToList(false);
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
      
      // Get the current active list or create a default one if it doesn't exist
      const currentActiveList = useGroceryList.getState().activeList;
      let targetList;
      
      if (currentActiveList) {
        console.log('Using active list for scanned product:', currentActiveList.name);
        targetList = currentActiveList;
      } else {
      const defaultList = await getOrCreateDefaultList(user.id);
        console.log('No active list, using default list for scanned product:', defaultList.name);
        targetList = defaultList;
      }
      
      // Add the product to the list
      const result = await addProductToGroceryList(targetList.id, user.id, product);
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
        description: translateUI(`${product.name || 'Producto'} agregado a ${targetList.name}`),
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding scanned product to list:', error);
      return Promise.reject(error);
    }
  };

  // Filter search results by store
  const filterSearchResults = (results: Product[], store: string): Product[] => {
    if (!store || store === 'all') return results;
    
    return results.filter(product => {
      const productStore = getProductStore(product);
      return productStore === store;
    });
  };

  // Memoize filtered results
  const filteredResults = useMemo(() => {
    return filterSearchResults(searchResults, storeFilter);
  }, [searchResults, storeFilter]);

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

  // Log active list when component mounts
  useEffect(() => {
    console.log('Index page mounted, activeList:', activeList?.id, activeList?.name);
  }, []);

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
      <div className="max-w-xl mx-auto mb-12 px-4 w-full" ref={searchBarRef}>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar 
              initialQuery={query} 
              onSearch={handleSearch} 
              expanded 
              onQueryChange={setQuery}
              isSearching={isSearching}
              className="search-bar transition-all duration-300"
            />
          </div>
          <Button 
            onClick={() => navigate('/grocery-list')}
            variant="outline"
            className="rounded-full h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-primary"
            aria-label={translateUI("Ver lista de compras")}
          >
            <ShoppingCart className="h-5 w-5" />
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
                <Select
                value={storeFilter} 
                  onValueChange={(value) => {
                    console.log(`Store selection changed to: ${value}`);
                    handleStoreFilterChange(value);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px] mb-4">
                    <SelectValue placeholder="Select Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center justify-between w-full">
                        <span><TranslatedText es="Todas las Tiendas" en="All Stores" /></span>
                        <span className="text-xs text-muted-foreground">({searchResults.length})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MaxiPali">
                      <div className="flex items-center justify-between w-full">
                        <span>MaxiPali</span>
                        <span className="text-xs text-muted-foreground">
                          ({searchResults.filter(p => p.store === 'MaxiPali').length})
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MasxMenos">
                      <div className="flex items-center justify-between w-full">
                        <span>MasxMenos</span>
                        <span className="text-xs text-muted-foreground">
                          ({searchResults.filter(p => p.store === 'MasxMenos').length})
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Walmart">
                      <div className="flex items-center justify-between w-full">
                        <span>Walmart</span>
                        <span className="text-xs text-muted-foreground">
                          ({searchResults.filter(p => p.store === 'Walmart').length})
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
              <TranslatedText es="Tiendas Destacadas" en="Featured Stores" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredStores.map((store) => (
                <div 
                  key={store.name} 
                  className="rounded-lg p-6 shadow-sm flex flex-col items-center justify-center h-32 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 
                      store.name === "Walmart" ? "#0071ce" : 
                      store.name === "MaxiPali" ? "#ffde00" : 
                      store.name === "MasxMenos" ? "#0001ab" : 
                      "white"
                  }}
                  onClick={() => {
                    // Change store filter
                    setStoreFilter(store.name as 'Walmart' | 'MaxiPali' | 'MasxMenos');
                    
                    // If there's no search query yet, scroll to search bar
                    if (!query) {
                      scrollToSearchBar();
                      toast({
                        title: translateUI("Store Selected"),
                        description: translateUI(`Search for products in ${store.name}`),
                      });
                    } else {
                      // If there's already a search query, filter the results
                      handleStoreFilterChange(store.name);
                    }
                  }}
                >
                  <img 
                    src={store.logo} 
                    alt={`${store.name} logo`} 
                    className="h-full object-contain mb-2" 
                  />
                  <p className="text-xs font-medium mt-2 text-center" style={{ 
                    color: store.name === "MaxiPali" ? "#000" : "#fff"
                  }}>
                    <TranslatedText 
                      es={`Buscar en ${store.name}`}
                      en={`Search in ${store.name}`}
                    />
                  </p>
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