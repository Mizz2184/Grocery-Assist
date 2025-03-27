import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PriceComparison } from "@/components/PriceComparison";
import { stores } from "@/utils/storeData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Share2, 
  Store,
  ShoppingBag,
  ArrowDown
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { compareProductPrices } from "@/lib/services";
import { Product as ProductType } from "@/lib/types/store";
import { getOrCreateDefaultList, addProductToGroceryList } from "@/lib/services/groceryListService";
import { formatCurrency } from "@/utils/currencyUtils";

// Price type for the PriceComparison component
interface Price {
  storeId: string;
  price: number;
  currency: string;
  date: string;
}

const Product = () => {
  const { id } = useParams<{ id: string }>();
  const [maxiPaliProduct, setMaxiPaliProduct] = useState<ProductType | null>(null);
  const [masxMenosProduct, setMasxMenosProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    bestPrice: {
      store: 'MaxiPali' | 'MasxMenos' | 'Unknown';
      price: number;
      savings: number;
      savingsPercentage: number;
    } | null;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProductComparison = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Check if the ID contains store information (format: store_id|product_id)
        let originalStore = undefined;
        let productId = id;
        
        if (id.includes('|')) {
          const parts = id.split('|');
          if (parts.length === 2) {
            originalStore = parts[0];
            productId = parts[1];
            console.log(`Detected original store: ${originalStore}, product ID: ${productId}`);
          }
        }
        
        // Set initial product states to null to avoid old data showing
        setMaxiPaliProduct(null);
        setMasxMenosProduct(null);
        
        // Search by the ID, which could be a name or barcode
        const result = await compareProductPrices(productId, undefined, originalStore);
        
        console.log("API comparison results:", result);
        
        // Filter out products with zero price
        const validMaxiPaliProducts = result.maxiPaliProducts.filter(p => p.price > 0);
        const validMasxMenosProducts = result.masxMenosProducts.filter(p => p.price > 0);
        
        console.log(`Valid MaxiPali products: ${validMaxiPaliProducts.length}`);
        console.log(`Valid MasxMenos products: ${validMasxMenosProducts.length}`);
        
        // Get the best matching products from each store
        const bestMaxiPaliMatch = validMaxiPaliProducts.length > 0 ? validMaxiPaliProducts[0] : null;
        const bestMasxMenosMatch = validMasxMenosProducts.length > 0 ? validMasxMenosProducts[0] : null;
        
        // Always set both store products, even if null
        setMaxiPaliProduct(bestMaxiPaliMatch);
        setMasxMenosProduct(bestMasxMenosMatch);
        
        // Log the products being set
        console.log("Setting MaxiPali product:", bestMaxiPaliMatch);
        console.log("Setting MasxMenos product:", bestMasxMenosMatch);
        
        // Recalculate best price if needed
        let bestPrice = result.bestPrice;
        
        // If we have valid products but original bestPrice is problematic
        if ((bestMaxiPaliMatch || bestMasxMenosMatch) && 
            (!bestPrice || bestPrice.price === 0)) {
          if (bestMaxiPaliMatch && bestMasxMenosMatch) {
            // Both stores have valid products - compare prices
            if (bestMaxiPaliMatch.price < bestMasxMenosMatch.price) {
              const savings = bestMasxMenosMatch.price - bestMaxiPaliMatch.price;
              const savingsPercentage = Math.round((savings / bestMasxMenosMatch.price) * 100);
              
              bestPrice = {
                store: 'MaxiPali',
                price: bestMaxiPaliMatch.price,
                savings,
                savingsPercentage
              };
            } else if (bestMasxMenosMatch.price < bestMaxiPaliMatch.price) {
              const savings = bestMaxiPaliMatch.price - bestMasxMenosMatch.price;
              const savingsPercentage = Math.round((savings / bestMaxiPaliMatch.price) * 100);
              
              bestPrice = {
                store: 'MasxMenos',
                price: bestMasxMenosMatch.price,
                savings,
                savingsPercentage
              };
            } else {
              // Same price
              bestPrice = {
                store: 'MaxiPali', // Default to MaxiPali if same price
                price: bestMaxiPaliMatch.price,
                savings: 0,
                savingsPercentage: 0
              };
            }
          } else if (bestMaxiPaliMatch) {
            // Only MaxiPali has a valid product
            bestPrice = {
              store: 'MaxiPali',
              price: bestMaxiPaliMatch.price,
              savings: 0,
              savingsPercentage: 0
            };
          } else if (bestMasxMenosMatch) {
            // Only MasxMenos has a valid product
            bestPrice = {
              store: 'MasxMenos',
              price: bestMasxMenosMatch.price,
              savings: 0,
              savingsPercentage: 0
            };
          }
        }
        
        setCompareResult({
          bestPrice
        });
        
        // Check if any of these products are in the user's list - this is a placeholder
        // In a real implementation, you would check against user's grocery list
        setIsInList(false);
      } catch (error) {
        console.error('Error fetching product comparison:', error);
        toast({
          title: "Error",
          description: "Failed to load product comparison. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProductComparison();
  }, [id, toast, user]);

  const handleAddToList = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your grocery list.",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }

    if (!maxiPaliProduct && !masxMenosProduct) {
      toast({
        title: "Error",
        description: "No product available to add to your list.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    
    try {
      // Get user's default list
      const defaultList = await getOrCreateDefaultList(user.id);
      
      // Choose the product from the store with the best price
      let productToAdd = null;
      
      if (compareResult?.bestPrice?.store === 'MaxiPali' && maxiPaliProduct) {
        productToAdd = maxiPaliProduct;
      } else if (compareResult?.bestPrice?.store === 'MasxMenos' && masxMenosProduct) {
        productToAdd = masxMenosProduct;
      } else {
        // If no best price or the preferred store doesn't have the product,
        // use whatever product is available
        productToAdd = maxiPaliProduct || masxMenosProduct;
      }
      
      if (!productToAdd) {
        throw new Error('No product available to add');
      }
      
      // Add to grocery list
      const result = await addProductToGroceryList(
        defaultList.id,
        user.id,
        productToAdd
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add product to list');
      }
      
      toast({
        title: "Added to list",
        description: `${productToAdd.name} has been added to your list from ${productToAdd.store}.`,
      });
      
      setIsInList(true);
    } catch (error) {
      console.error('Error adding to list:', error);
      toast({
        title: "Error",
        description: "Failed to add product to your list.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleShare = () => {
    const productName = maxiPaliProduct?.name || masxMenosProduct?.name || 'Product';
    
    if (navigator.share) {
      navigator.share({
        title: `${productName} - Price Comparison`,
        text: `Check out the prices for ${productName} on Shop Assist!`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: "Link copied",
          description: "The product link has been copied to your clipboard.",
        });
      });
    }
  };

  // Convert products to the format expected by PriceComparison component
  const getPriceComparisonData = (): Price[] => {
    console.log("Creating price comparison data:");
    console.log("MaxiPali product:", maxiPaliProduct);
    console.log("MasxMenos product:", masxMenosProduct);
    
    const prices: Price[] = [];
    
    // Always add MaxiPali data with consistent ID
    const maxiPaliPrice: Price = {
      storeId: 'maxipali', // Ensure lowercase consistent with stores.find lookup
      price: maxiPaliProduct?.price || 0,
      currency: '₡',
      date: new Date().toISOString()
    };
    console.log("Adding MaxiPali price:", maxiPaliPrice);
    prices.push(maxiPaliPrice);
    
    // Always add MasxMenos data with consistent ID
    const masxMenosPrice: Price = {
      storeId: 'masxmenos', // Ensure lowercase consistent with stores.find lookup
      price: masxMenosProduct?.price || 0,
      currency: '₡',
      date: new Date().toISOString()
    };
    console.log("Adding MasxMenos price:", masxMenosPrice);
    prices.push(masxMenosPrice);
    
    console.log("Final price comparison data:", prices);
    return prices;
  };

  const calculateSavings = () => {
    if (!maxiPaliProduct || !masxMenosProduct) return null;
    
    const maxiPaliPrice = maxiPaliProduct.price || 0;
    const masxMenosPrice = masxMenosProduct.price || 0;
    
    if (maxiPaliPrice === 0 || masxMenosPrice === 0) return null;
    
    if (maxiPaliPrice < masxMenosPrice) {
      const savingsAmount = masxMenosPrice - maxiPaliPrice;
      const savingsPercentage = Math.round((savingsAmount / masxMenosPrice) * 100);
      return {
        betterStore: "MaxiPali",
        amount: savingsAmount,
        percentage: savingsPercentage
      };
    } else if (masxMenosPrice < maxiPaliPrice) {
      const savingsAmount = maxiPaliPrice - masxMenosPrice;
      const savingsPercentage = Math.round((savingsAmount / maxiPaliPrice) * 100);
      return {
        betterStore: "MasxMenos",
        amount: savingsAmount,
        percentage: savingsPercentage
      };
    }
    
    return {
      betterStore: "Equal",
      amount: 0,
      percentage: 0
    };
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              disabled
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded mt-6" />
              <div className="h-32 bg-muted animate-pulse rounded mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!maxiPaliProduct && !masxMenosProduct) {
    return (
      <div className="page-container">
        <div className="max-w-5xl mx-auto text-center py-12">
          <h1 className="text-2xl font-medium mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find this product in any store.
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Choose which product to display main info for (prefer the one with best price)
  const mainProduct = compareResult?.bestPrice?.store === 'MasxMenos' && masxMenosProduct 
    ? masxMenosProduct 
    : (maxiPaliProduct || masxMenosProduct);

  const savings = calculateSavings();

  if (!mainProduct) return null;

  return (
    <div className="page-container">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-muted-foreground">Back to search</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative overflow-hidden rounded-lg bg-muted/30 aspect-square">
            <img 
              src={mainProduct.imageUrl || 'https://placehold.co/400?text=No+Image'} 
              alt={mainProduct.name} 
              className="w-full h-full object-cover animate-scale-in"
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="font-normal">
                {mainProduct.store}
              </Badge>
            </div>
            {compareResult?.bestPrice && (
              <div className="absolute bottom-2 right-2">
                <Badge variant="default" className="bg-green-600 text-white">
                  Best Price: {compareResult.bestPrice.store}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-medium">{mainProduct.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-lg text-muted-foreground">{mainProduct.brand || 'Unknown brand'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="font-normal">
                  {mainProduct.category || 'Grocery'}
                </Badge>
                {mainProduct.ean && (
                <Badge variant="outline" className="font-normal">
                    Barcode: {mainProduct.ean}
                </Badge>
                )}
              </div>
            </div>
            
            <Button
              className={cn(
                "w-full rounded-full h-12 gap-2",
                isInList && "bg-green-600 hover:bg-green-700"
              )}
              disabled={isAdding || isInList}
              onClick={handleAddToList}
            >
              {isInList ? (
                <>
                  <Check className="h-5 w-5" />
                  Added to List
                </>
              ) : isAdding ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Adding to List...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add to Grocery List
                </>
              )}
            </Button>
            
            {/* Price Comparison Section */}
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted p-3 border-b">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Price Comparison
                </h3>
              </div>
              
              <div className="p-4">
                {/* Show savings summary if both stores have the product */}
                {savings && savings.betterStore !== "Equal" && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/20 dark:border-green-900/30">
                    <h4 className="text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                      <ArrowDown className="w-4 h-4" /> 
                      Save {formatCurrency(savings.amount, "CRC")} ({savings.percentage}%)
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {savings.betterStore} offers a better price compared to {savings.betterStore === "MaxiPali" ? "MasxMenos" : "MaxiPali"}.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* MaxiPali product */}
                  <div className={cn(
                    "p-3 rounded-lg border flex gap-3",
                    maxiPaliProduct && compareResult?.bestPrice?.store === "MaxiPali" && "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                  )}>
                    {/* Store icon and color */}
                    <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-black" />
                    </div>

                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <div className="flex-grow">
                          <h4 className="font-medium text-lg">MaxiPali</h4>
                          {maxiPaliProduct ? (
                            <p className="text-sm line-clamp-2">{maxiPaliProduct.name}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Product not available at this store</p>
                          )}
                        </div>
                        {maxiPaliProduct && (
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-lg">₡{maxiPaliProduct.price.toLocaleString('es-CR')}</p>
                            {compareResult?.bestPrice?.store === "MaxiPali" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">
                                Best Price
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* MasxMenos product */}
                  <div className={cn(
                    "p-3 rounded-lg border flex gap-3",
                    masxMenosProduct && compareResult?.bestPrice?.store === "MasxMenos" && "border-green-400 bg-green-50 dark:bg-green-900/20"
                  )}>
                    {/* Store icon and color */}
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <div className="flex-grow">
                          <h4 className="font-medium text-lg">MasxMenos</h4>
                          {masxMenosProduct ? (
                            <p className="text-sm line-clamp-2">{masxMenosProduct.name}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Product not available at this store</p>
                          )}
                        </div>
                        {masxMenosProduct && (
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-lg">₡{masxMenosProduct.price.toLocaleString('es-CR')}</p>
                            {compareResult?.bestPrice?.store === "MasxMenos" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">
                                Best Price
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Original PriceComparison Component for additional visualization */}
            {getPriceComparisonData().length > 1 && (
              <PriceComparison prices={getPriceComparisonData()} detailed compareStores={true} />
            )}
            
            {/* Store Links Section */}
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-3">Visit Store</h3>
              <div className="grid grid-cols-2 gap-3">
                {getPriceComparisonData().map((price) => {
                  const storeId = price.storeId;
                  const store = stores.find(s => s.id === storeId);
                  if (!store) return null;
                  
                  // Check if this is the best price store
                  const isLowestPrice = compareResult?.bestPrice?.store.toLowerCase() === storeId.toLowerCase();
                  
                  return (
                    <a 
                      key={storeId}
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg glass-card glass-hover"
                      style={{ borderLeft: `3px solid ${store.color}` }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: store.color }}
                      >
                        <Store className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                      <span className="font-medium">{store.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {price.currency}{price.price.toLocaleString('es-CR', {minimumFractionDigits: 0})}
                          {isLowestPrice && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 h-4 bg-green-50 text-green-700 border-green-100">
                              Best Price
                            </Badge>
                          )}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
