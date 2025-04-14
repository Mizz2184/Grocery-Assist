import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { mockGroceryLists } from "@/utils/productData";
import { stores } from "@/utils/storeData";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/context/SearchContext";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search as SearchIcon, Scan, Filter, ArrowLeft, Minus, Plus, Store } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { searchMaxiPaliProducts, searchMasxMenosProducts, searchWalmartProducts } from "@/lib/services";
import { 
  getOrCreateDefaultList, 
  addProductToGroceryList,
  syncGroceryListToDatabase,
  getUserGroceryLists 
} from '@/lib/services/groceryListService';
import { Product as ProductType } from "@/lib/types/store";
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
import { STORE, storeColors } from '@/utils/storeUtils';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
import { formatPrice } from "@/lib/utils/currency";
import { useSearchNavigation } from "@/hooks/useSearchNavigation";

interface ProductGridProps {
  products: ProductType[];
  onAddToList: (product: ProductType) => Promise<void>;
  isProductInList: (productId: string, store?: string) => boolean;
}

const ProductGrid = ({ products, onAddToList, isProductInList }: ProductGridProps) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <AutoSizer disableHeight className="w-full">
        {({ width }) => {
          const columnCount = 2; // Force 2 columns
          const gap = 16; // Define gap for calculation
          const cardWidth = (width - gap * (columnCount - 1)) / columnCount;
          const rowCount = Math.ceil(products.length / columnCount);
          const cardHeight = cardWidth * 1.6; // Maintain aspect ratio

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={cardWidth + gap}
              height={Math.min(rowCount * (cardHeight + gap), window.innerHeight * 0.8)}
              rowCount={rowCount}
              rowHeight={cardHeight + gap}
              width={width}
              itemData={{ products, columnCount, onAddToList, isProductInList }}
              className="product-grid-scroll scrollbar-hide"
              style={{ overflowX: 'hidden' }}
            >
              {ProductGridCell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

// Define the missing cell renderer component
const ProductGridCell = ({ columnIndex, rowIndex, style, data }: any) => {
  const { products, columnCount, onAddToList, isProductInList } = data;
  const index = rowIndex * columnCount + columnIndex;
  
  // Prevent rendering cells beyond the actual product count
  if (index >= products.length) {
    return null; 
  }

  const product = products[index];

  // Apply the style provided by FixedSizeGrid (width, height, positioning)
  // REMOVED internal padding to prevent clipping
  return (
    <div style={style} className="flex items-stretch p-[8px]"> {/* Apply padding using className instead */} 
      <ProductCardComponent 
        product={product} 
        onAddToList={onAddToList} 
        isInList={isProductInList(product.id, product.store)}
      />
    </div>
  );
};

interface ProductCardProps {
  product: ProductType;
  onAddToList: (product: ProductType) => Promise<void>;
  isInList: boolean;
}

const ProductCardComponent = ({ product, onAddToList, isInList }: ProductCardProps) => {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const { translateTitle, translateText, translateUI } = useTranslation();
  const { navigatePreservingSearch } = useSearchNavigation();
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await onAddToList(product);
    } catch (error) {
      console.error("Error adding product in card component:", error);
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleCardNavigation = () => {
    const navigationId = `${product.store || 'unknown'}|${product.id}`;
    navigatePreservingSearch(`/product/${navigationId}`);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 relative group">
      <CardContent 
        className="p-3 flex-grow cursor-pointer" 
        onClick={handleCardNavigation}
      >
        <div className="aspect-square w-full overflow-hidden rounded-md mb-3 relative bg-muted">
          <img 
            src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
            alt={translateTitle(product.name)} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {product.store && (
            <Badge 
              variant="secondary"
              className={cn(
                "absolute top-2 left-2 py-0.5 px-1.5 text-xs font-medium rounded-sm border-none",
                storeColors[product.store as keyof typeof storeColors] || storeColors[STORE.UNKNOWN]
              )}
            >
              {product.store}
            </Badge>
          )}
        </div>
        <h3 
          className="font-medium text-sm leading-snug mb-1 line-clamp-2 h-[2.7em]"
          title={translateTitle(product.name)}
        >
          {translateTitle(product.name)}
        </h3>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
          {translateText(product.brand) || translateText('Marca desconocida')}
        </p>
      </CardContent>
      <CardFooter className="p-3 pt-0 mt-auto flex items-center justify-between">
        <div className="font-semibold text-sm text-primary">
          {formatPrice(product.price)}
        </div>
        <Button 
          variant={isInList ? "secondary" : "default"}
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={handleAddClick}
          disabled={isAdding || isInList}
          aria-label={isInList ? translateUI("En la Lista") : translateUI("Agregar")}
        >
          {isAdding ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
          ) : isInList ? (
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const ProductDetailModal = ({ 
  product, 
  onClose, 
  onAddToList, 
  isInList 
}: { 
  product: ProductType, 
  onClose: () => void, 
  onAddToList: (quantity: number) => Promise<void>,
  isInList: boolean
}) => {
  const [quantity, setQuantity] = useState(1);
  const totalPrice = product.price * quantity;
  // const usdPrice = convertCRCtoUSD(totalPrice);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product.store && (
              <Badge 
                variant="secondary"
                className={cn(
                  "py-0.5 px-1.5 text-xs font-medium rounded-sm border-none",
                  storeColors[product.store as keyof typeof storeColors] || storeColors[STORE.UNKNOWN]
                )}
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
                {/* <div className="text-sm text-muted-foreground">
                  ${convertCRCtoUSD(product.price).toFixed(2)} USD
                </div> */}
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
                  {/* <div className="text-sm text-muted-foreground">
                    ${usdPrice.toFixed(2)} USD
                  </div> */}
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
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { activeList, setActiveList } = useGroceryList();
  const [addingToList, setAddingToList] = useState(false);
  const { navigatePreservingSearch } = useSearchNavigation();

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
      const rect = searchBarRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const absoluteY = rect.top + scrollTop;
      
      const offset = window.innerWidth <= 768 ? 80 : 20;
      
      window.scrollTo({
        top: absoluteY - offset,
        behavior: 'smooth'
      });
      
      searchBarRef.current.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      
      setTimeout(() => {
        const searchInput = searchBarRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 500);
      
      setTimeout(() => {
        if (searchBarRef.current) {
          searchBarRef.current.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }
      }, 2000);
    }
  }, []);

  useEffect(() => {
    const isPotentialPaymentRedirect = localStorage.getItem(`payment_session_${user?.id}`);
    
    if (isPotentialPaymentRedirect && user) {
      toast({
        title: translateUI("Payment Successful"),
        description: translateUI("Thank you for your payment. You now have full access to search for products."),
      });
      
      localStorage.removeItem(`payment_session_${user.id}`);
    }
  }, [user, toast, translateUI]);

  useEffect(() => {
    if (scrollPosition > 0 && searchResultsRef.current) {
      console.log(`Restoring scroll position to ${scrollPosition}px`);
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
      }, 100);
    }
  }, [scrollPosition]);

  useEffect(() => {
    return () => {
      if (query && searchResults.length > 0) {
        const finalScroll = window.scrollY;
        console.log(`Index.tsx: Component unmounting, saving final scroll position ${finalScroll}px to sessionStorage.`);
        sessionStorage.setItem('search_scroll_position', finalScroll.toString());
      }
    };
  }, [query, searchResults.length]);

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

  const isProductInList = (productId: string, store: string) => {
    try {
      if (productsInList.has(productId)) {
        console.log(`isProductInList: Found product ${productId} in productsInList Set`);
        return true;
      }
      
      const allLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const productStore = store ? store : STORE.UNKNOWN;
      
      for (const list of allLists) {
        if (!list.items) continue;
        
        for (const item of list.items) {
          if (item.productId === productId) {
            console.log(`isProductInList: Found product ${productId} in localStorage lists`);
            
            setProductsInList(prev => new Set([...prev, productId]));
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if product is in list:', error);
      return productsInList.has(productId);
    }
  };

  const rankSearchResults = (results: ProductType[], term: string): ProductType[] => {
    const termLower = term.toLowerCase();
    
    return [...results].sort((a, b) => {
      let aScore = 0;
      let bScore = 0;
      
      if (a.name.toLowerCase() === termLower) aScore += 10;
      if (b.name.toLowerCase() === termLower) bScore += 10;
      
      if (a.name.toLowerCase().includes(termLower)) aScore += 5;
      if (b.name.toLowerCase().includes(termLower)) bScore += 5;
      
      if ((a.brand || '').toLowerCase().includes(termLower)) aScore += 3;
      if ((b.brand || '').toLowerCase().includes(termLower)) bScore += 3;
      
      if ((a.description || '').toLowerCase().includes(termLower)) aScore += 1;
      if ((b.description || '').toLowerCase().includes(termLower)) bScore += 1;
      
      return bScore - aScore;
    });
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    
    console.log('Performing product search for:', searchQuery);
    setIsSearching(true);
    
    setQuery(searchQuery);

    try {
      console.log('Starting parallel store searches...');
      const [maxiPaliResults, masxMenosResults, walmartResults] = await Promise.all([
        searchMaxiPaliProducts({ query: searchQuery }),
        searchMasxMenosProducts({ query: searchQuery }),
        searchWalmartProducts({ query: searchQuery })
      ]);
      console.log('All store API searches completed');

      console.log('=== DEBUG SEARCH RESPONSES ===');
      console.log('MaxiPali response structure:', JSON.stringify(maxiPaliResults).substring(0, 200) + '...');
      console.log('MasxMenos response structure:', JSON.stringify(masxMenosResults).substring(0, 200) + '...');
      console.log('Walmart response structure:', JSON.stringify(walmartResults).substring(0, 200) + '...');

      let combinedResults: ProductType[] = [];
      let totalProductCount = 0;
      
      if (maxiPaliResults && maxiPaliResults.products && maxiPaliResults.products.length > 0) {
        console.log(`Adding ${maxiPaliResults.products.length} MaxiPali products`);
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
      
      if (masxMenosResults && masxMenosResults.products && masxMenosResults.products.length > 0) {
        console.log(`Adding ${masxMenosResults.products.length} MasxMenos products`);
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
      
      if (walmartResults && walmartResults.products && walmartResults.products.length > 0) {
        console.log(`Adding ${walmartResults.products.length} Walmart products`);
        const walmartWithStore = walmartResults.products.map(p => ({
          ...p,
          store: 'Walmart' as const
        }));
        
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
      
      if (combinedResults.length === 0) {
        console.log('No products found across any store');
        toast({
          title: translateUI("No Se Encontraron Resultados"),
          description: translateUI(`No pudimos encontrar productos que coincidan con "${searchQuery}"`),
          variant: "destructive"
        });
      } else {
        console.log(`Found ${combinedResults.length} total products, by store count: MaxiPali=${maxiPaliResults.products?.length || 0}, MasxMenos=${masxMenosResults.products?.length || 0}, Walmart=${walmartResults.products?.length || 0}`);
        
        combinedResults = combinedResults.filter(product => {
          if (!product.id || !product.name || typeof product.price !== 'number') {
            console.error('Invalid product found in results:', product);
            return false;
          }
          return true;
        });
        
        const storeTypes = combinedResults.map(p => p.store);
        const uniqueStores = [...new Set(storeTypes)];
        console.log('Store types in combined results:', uniqueStores);
        
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
      
      console.log(`Index.tsx/handleSearch: Saving query="${searchQuery}" and ${combinedResults.length} results DIRECTLY to sessionStorage BEFORE updating context.`);
      sessionStorage.setItem('search_query', searchQuery);
      sessionStorage.setItem('search_results', JSON.stringify(combinedResults));
      
      console.log(`About to set ${combinedResults.length} search results in context.`);
      setSearchResults(combinedResults);
      console.log('Set search results called with', combinedResults.length, 'products');
      
    } catch (error) {
      console.error('Error during search:', error);
      toast({
        title: translateUI("Error de Búsqueda"),
        description: translateUI("Ocurrió un error durante la búsqueda. Por favor intenta de nuevo."),
        variant: "destructive"
      });
      
      console.log('Index.tsx/handleSearch: Clearing sessionStorage due to search error.');
      sessionStorage.removeItem('search_results');
      sessionStorage.removeItem('search_query');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToList = async (product: ProductType) => {
      if (!user) {
        toast({
        title: "Error",
        description: "Please log in to add products to your list",
          variant: "destructive",
        });
      return;
      }
      
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

      const productToAdd = {
        ...product,
        quantity: product.quantity || 1,
        store: product.store || STORE.UNKNOWN
      };

      const result = await addProductToGroceryList(
        currentActiveList.id,
        user.id,
        productToAdd
      );

      if (result.success) {
        setProductsInList(prev => new Set([...prev, product.id]));
        
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
  
  const handleAddScannedProduct = async (product: ProductType) => {
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

  const filterSearchResults = (results: ProductType[], store: string): ProductType[] => {
    if (!store || store === 'all') return results;
    
    return results.filter(product => {
      const productStore = (product.store || '').trim().toLowerCase();
      const filterStore = store.trim().toLowerCase();
      return productStore === filterStore;
    });
  };

  const filteredResults = useMemo(() => {
    return filterSearchResults(searchResults, storeFilter);
  }, [searchResults, storeFilter]);

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

  const handleStoreFilterChange = (value: string) => {
    console.log(`Changing store filter from ${storeFilter} to ${value}`);
    
    setStoreFilter(value as 'all' | 'MaxiPali' | 'MasxMenos' | 'Walmart');
    
    if (value !== 'all' && searchResults.length > 0) {
      const expectedCount = searchResults.filter(p => 
        String(p.store).trim().toLowerCase() === value.toLowerCase()
      ).length;
      
      console.log(`Selected filter: ${value}. Expected products matching this filter: ${expectedCount}`);
      
      const exactMatches = searchResults.filter(p => p.store === value).length;
      if (exactMatches !== expectedCount) {
        console.warn(`Store case sensitivity issue detected. Exact matches: ${exactMatches}, 
                     Case-insensitive matches: ${expectedCount}`);
      }
    }
    
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

  useEffect(() => {
    console.log('Index page mounted, activeList:', activeList?.id, activeList?.name);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (query && searchResults.length > 0) {
        const currentPos = window.scrollY;
        if (Math.abs(currentPos - scrollPosition) > 50) {
          setScrollPosition(currentPos);
        }
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const throttledScroll = () => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          handleScroll();
          timeoutId = undefined;
        }, 100);
      }
    };

    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [query, searchResults.length, scrollPosition, setScrollPosition]);

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto text-center mb-8 px-4 w-full">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          <TranslatedText es="Comparar Precios, Ahorrar Dinero" en="Compare Prices, Save Money" />
        </h1>
        <p className="text-muted-foreground text-lg">
          <TranslatedText es="Encuentra las mejores ofertas de supermercados en MaxiPali, MasxMenos y Walmart" en="Find the best grocery deals at MaxiPali, MasxMenos, and Walmart" />
        </p>
      </div>

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
            onClick={() => navigatePreservingSearch('/grocery-list')}
            variant="outline"
            className="rounded-full h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-primary"
            aria-label={translateUI("Ver lista de compras")}
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>

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
                    setStoreFilter(store.name as 'Walmart' | 'MaxiPali' | 'MasxMenos');
                    
                    if (!query) {
                      scrollToSearchBar();
                      toast({
                        title: translateUI("Store Selected"),
                        description: translateUI(`Search for products in ${store.name}`),
                      });
                    } else {
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

      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAddProduct={handleAddScannedProduct}
      />
    </div>
  );
};

export default Index;