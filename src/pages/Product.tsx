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
  ArrowDown,
  Scale
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

// Create separate store product display components to better handle the rendering
const MaxiPaliProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      product 
        ? (isLowestPrice 
          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" 
          : "")
        : "border-dashed border-muted"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-black" />
        </div>
        <h4 className="font-medium text-lg">MaxiPali</h4>
        {product && isLowestPrice && (
          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-100">
            Best Price
          </Badge>
        )}
      </div>
      
      {product ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium line-clamp-2">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.brand || 'Unknown brand'}</p>
            </div>
          </div>
          <div className="font-bold text-lg">
            ₡{product.price.toLocaleString('es-CR')}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            Product not available at MaxiPali
          </p>
        </div>
      )}
    </div>
  );
};

const MasxMenosProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      product 
        ? (isLowestPrice 
          ? "border-green-400 bg-green-50 dark:bg-green-900/20" 
          : "")
        : "border-dashed border-muted"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-white" />
        </div>
        <h4 className="font-medium text-lg">MasxMenos</h4>
        {product && isLowestPrice && (
          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-100">
            Best Price
          </Badge>
        )}
      </div>
      
      {product ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium line-clamp-2">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.brand || 'Unknown brand'}</p>
            </div>
          </div>
          <div className="font-bold text-lg">
            ₡{product.price.toLocaleString('es-CR')}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            Product not available at MasxMenos
          </p>
        </div>
      )}
    </div>
  );
};

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
  const [matchedProducts, setMatchedProducts] = useState<{ maxiPali: ProductType | null, masxMenos: ProductType | null }[]>([]);

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

        setMaxiPaliProduct(null);
        setMasxMenosProduct(null);
        
        // Search by the ID, which could be a name or barcode
        console.log(`Fetching comparison for product: ${productId} from original store: ${originalStore || 'unknown'}`);
        const result = await compareProductPrices(productId, undefined, originalStore);
        
        console.log("API comparison results:", result);
        
        // Filter out products with zero price
        const validMaxiPaliProducts = result.maxiPaliProducts.filter(p => p.price > 0);
        const validMasxMenosProducts = result.masxMenosProducts.filter(p => p.price > 0);
        
        console.log(`Valid MaxiPali products: ${validMaxiPaliProducts.length}`);
        console.log(`Valid MasxMenos products: ${validMasxMenosProducts.length}`);

        // Find best matching products by name similarity
        let bestMatches: { maxiPali: ProductType | null, masxMenos: ProductType | null }[] = [];
        
        // If we have products from both stores, try to match them
        if (validMaxiPaliProducts.length > 0 && validMasxMenosProducts.length > 0) {
          // Helper functions to clean and normalize product names for better matching
          const normalizeText = (text: string) => {
            return text.toLowerCase()
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/[^\w\s]/g, '')  // Remove punctuation
              .replace(/\d+\s*(kg|g|ml|l|oz)/gi, ''); // Remove weight/volume
          };
          
          // Calculate similarity score between two product names (0-100)
          const getNameSimilarity = (name1: string, name2: string): number => {
            const norm1 = normalizeText(name1);
            const norm2 = normalizeText(name2);
            
            // Direct inclusion check
            if (norm1.includes(norm2) || norm2.includes(norm1)) {
              return 90;
            }
            
            // Word matching - count how many words match
            const words1 = norm1.split(' ');
            const words2 = norm2.split(' ');
            
            let matchCount = 0;
            for (const word1 of words1) {
              if (word1.length < 3) continue; // Skip short words
              if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
                matchCount++;
              }
            }
            
            const matchRatio = matchCount / Math.max(words1.length, words2.length);
            return matchRatio * 100;
          };
          
          // Calculate overall similarity considering name, brand, and category
          const getProductSimilarity = (p1: ProductType, p2: ProductType): number => {
            const nameSimilarity = getNameSimilarity(p1.name, p2.name);
            
            // Brand similarity (adds 10 points if brands match)
            const brandSimilarity = p1.brand && p2.brand && 
              normalizeText(p1.brand) === normalizeText(p2.brand) ? 10 : 0;
            
            // Category similarity (adds 5 points if categories match)
            const categorySimilarity = p1.category && p2.category && 
              normalizeText(p1.category) === normalizeText(p2.category) ? 5 : 0;
            
            return nameSimilarity + brandSimilarity + categorySimilarity;
          };
          
          // Organize by similarity to show similar products side by side
          let usedMaxiPali = new Set<string>();
          let usedMasxMenos = new Set<string>();
          
          // First find closest matches between the two stores
          const potentialMatches: Array<{
            maxiPali: ProductType, 
            masxMenos: ProductType, 
            similarity: number
          }> = [];
          
          // Build all possible matches with similarity scores
          validMaxiPaliProducts.forEach(maxiProd => {
            validMasxMenosProducts.forEach(masxProd => {
              const similarity = getProductSimilarity(maxiProd, masxProd);
              
              // Only consider matches with reasonable similarity
              if (similarity >= 50) {
                potentialMatches.push({
                  maxiPali: maxiProd,
                  masxMenos: masxProd,
                  similarity
                });
              }
            });
          });
          
          // Sort by similarity (highest first)
          potentialMatches.sort((a, b) => b.similarity - a.similarity);
          
          // Take matches in order of similarity, ensuring no product is used twice
          potentialMatches.forEach(match => {
            if (!usedMaxiPali.has(match.maxiPali.id) && 
                !usedMasxMenos.has(match.masxMenos.id)) {
              bestMatches.push({
                maxiPali: match.maxiPali,
                masxMenos: match.masxMenos
              });
              
              usedMaxiPali.add(match.maxiPali.id);
              usedMasxMenos.add(match.masxMenos.id);
            }
          });
          
          // Then add unpaired products
          validMaxiPaliProducts.forEach(prod => {
            if (!usedMaxiPali.has(prod.id)) {
              bestMatches.push({ maxiPali: prod, masxMenos: null });
              usedMaxiPali.add(prod.id);
            }
          });
          
          validMasxMenosProducts.forEach(prod => {
            if (!usedMasxMenos.has(prod.id)) {
              bestMatches.push({ maxiPali: null, masxMenos: prod });
              usedMasxMenos.add(prod.id);
            }
          });
        } else if (validMaxiPaliProducts.length > 0) {
          // Only MaxiPali products
          validMaxiPaliProducts.forEach(prod => {
            bestMatches.push({ maxiPali: prod, masxMenos: null });
          });
        } else if (validMasxMenosProducts.length > 0) {
          // Only MasxMenos products
          validMasxMenosProducts.forEach(prod => {
            bestMatches.push({ maxiPali: null, masxMenos: prod });
          });
        }
        
        // Get the best matching products from each store with prefixed IDs to help React distinguish them
        let bestMaxiPaliMatch = validMaxiPaliProducts.length > 0 ? 
          { ...validMaxiPaliProducts[0], id: `maxipali-${validMaxiPaliProducts[0].id}` } : null;
        let bestMasxMenosMatch = validMasxMenosProducts.length > 0 ? 
          { ...validMasxMenosProducts[0], id: `masxmenos-${validMasxMenosProducts[0].id}` } : null;
        
        console.log("Setting MaxiPali product:", bestMaxiPaliMatch);
        console.log("Setting MasxMenos product:", bestMasxMenosMatch);
        console.log("Best matches:", bestMatches);
        
        // Force the component to recognize these as new objects by using a small delay to break React batching
        setTimeout(() => {
          if (bestMaxiPaliMatch) {
            setMaxiPaliProduct(bestMaxiPaliMatch);
          } else {
            setMaxiPaliProduct(null);
          }
          
          if (bestMasxMenosMatch) {
            setMasxMenosProduct(bestMasxMenosMatch);
          } else {
            setMasxMenosProduct(null);
          }

          // Set all matched products
          setMatchedProducts(bestMatches);
        }, 50);
        
        // Calculate best price
        let bestPrice = null;
        
        // Check if we found at least one product
        if (!bestMaxiPaliMatch && !bestMasxMenosMatch) {
          toast({
            title: "No products found",
            description: "Could not find this product in any store.",
            variant: "destructive"
          });
        } else if (!bestMaxiPaliMatch) {
          toast({
            description: "Product found only in MasxMenos.",
          });
        } else if (!bestMasxMenosMatch) {
          toast({
            description: "Product found only in MaxiPali.",
          });
        } else {
          toast({
            description: "Product found in both stores. Compare prices below!",
          });
        }
        
        // Recalculate best price if needed
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

  // Add useEffect to monitor product state changes
  useEffect(() => {
    console.log("maxiPaliProduct state updated:", maxiPaliProduct);
  }, [maxiPaliProduct]);
  
  useEffect(() => {
    console.log("masxMenosProduct state updated:", masxMenosProduct);
  }, [masxMenosProduct]);

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
  
  // Add a specific product from the matches to the grocery list
  const handleAddMatchedProduct = async (product: ProductType) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your grocery list.",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }
    
    try {
      // Get user's default list
      const defaultList = await getOrCreateDefaultList(user.id);
      
      // Add to grocery list
      const result = await addProductToGroceryList(
        defaultList.id,
        user.id,
        product
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add product to list');
      }
      
      toast({
        title: "Added to list",
        description: `${product.name} has been added to your list from ${product.store}.`,
      });
    } catch (error) {
      console.error('Error adding to list:', error);
      toast({
        title: "Error",
        description: "Failed to add product to your list.",
        variant: "destructive",
      });
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
            <div className="rounded-lg border overflow-hidden mt-8">
              <div className="bg-muted p-3 border-b">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Price Comparison
                </h3>
              </div>
              
              <div className="p-4">
                {/* Show savings summary if both stores have the product */}
                {savings && savings.betterStore !== "Equal" && maxiPaliProduct && masxMenosProduct && (
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Debug info */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div className="col-span-2 mb-4 p-3 bg-gray-100 border border-gray-200 rounded text-xs font-mono overflow-auto max-h-32">
                      <div>MaxiPali: {maxiPaliProduct ? '✅' : '❌'}</div>
                      <div>MasxMenos: {masxMenosProduct ? '✅' : '❌'}</div>
                      <div>MaxiPali Name: {maxiPaliProduct?.name || 'N/A'}</div>
                      <div>MaxiPali ID: {maxiPaliProduct?.id || 'N/A'}</div>
                      <div>MaxiPali Price: {maxiPaliProduct?.price || 'N/A'}</div>
                    </div>
                  )}
                
                  {/* MaxiPali product - ALWAYS SHOW THIS SECTION */}
                  <MaxiPaliProductDisplay product={maxiPaliProduct} isLowestPrice={compareResult?.bestPrice?.store === "MaxiPali"} />
                  
                  {/* MasxMenos product - ALWAYS SHOW THIS SECTION */}
                  <MasxMenosProductDisplay product={masxMenosProduct} isLowestPrice={compareResult?.bestPrice?.store === "MasxMenos"} />
                </div>
              </div>
            </div>
            
            {/* Original PriceComparison Component for additional visualization */}
            {getPriceComparisonData().length > 1 && (
              <PriceComparison prices={getPriceComparisonData()} detailed compareStores={true} />
            )}
            
            {/* Similar Products Section - Show matched products side by side */}
            {matchedProducts.length > 1 && (
              <div className="rounded-lg border overflow-hidden mt-8">
                <div className="bg-muted p-3 border-b">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Similar Products
                  </h3>
                </div>
                
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    These products have been matched between stores based on similar names and attributes.
                  </p>
                  
                  {matchedProducts.map((match, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* MaxiPali product */}
                        <div className={cn(
                          "p-4 rounded-lg border",
                          match.maxiPali ? "border-yellow-200" : "border-dashed border-muted"
                        )}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                              <Store className="w-3 h-3 text-black" />
                            </div>
                            <h4 className="font-medium">MaxiPali</h4>
                          </div>
                          
                          {match.maxiPali ? (
                            <div className="space-y-2">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                                  <img 
                                    src={match.maxiPali.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={match.maxiPali.name} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium line-clamp-2">{match.maxiPali.name}</p>
                                  <p className="text-sm text-muted-foreground">{match.maxiPali.brand || 'Unknown brand'}</p>
                                  <div className="font-semibold">
                                    ₡{match.maxiPali.price.toLocaleString('es-CR')}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => handleAddMatchedProduct(match.maxiPali)}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add to List
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center">
                              <p className="text-muted-foreground">
                                Product not available at MaxiPali
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* MasxMenos product */}
                        <div className={cn(
                          "p-4 rounded-lg border",
                          match.masxMenos ? "border-green-200" : "border-dashed border-muted"
                        )}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                              <Store className="w-3 h-3 text-white" />
                            </div>
                            <h4 className="font-medium">MasxMenos</h4>
                          </div>
                          
                          {match.masxMenos ? (
                            <div className="space-y-2">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                                  <img 
                                    src={match.masxMenos.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={match.masxMenos.name} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium line-clamp-2">{match.masxMenos.name}</p>
                                  <p className="text-sm text-muted-foreground">{match.masxMenos.brand || 'Unknown brand'}</p>
                                  <div className="font-semibold">
                                    ₡{match.masxMenos.price.toLocaleString('es-CR')}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => handleAddMatchedProduct(match.masxMenos)}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add to List
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center">
                              <p className="text-muted-foreground">
                                Product not available at MasxMenos
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Price comparison and savings */}
                      {match.maxiPali && match.masxMenos && (
                        <div className="mt-3 pt-3 border-t">
                          {match.maxiPali.price !== match.masxMenos.price && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Price difference:</span>
                              <Badge 
                                variant={match.maxiPali.price < match.masxMenos.price ? "secondary" : "default"}
                                className={cn(
                                  "font-normal",
                                  match.maxiPali.price < match.masxMenos.price 
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                )}
                              >
                                {match.maxiPali.price < match.masxMenos.price ? 'MaxiPali cheaper by' : 'MasxMenos cheaper by'} 
                                {' '}₡{Math.abs(match.maxiPali.price - match.masxMenos.price).toLocaleString('es-CR')}
                                {' '}({Math.round((Math.abs(match.maxiPali.price - match.masxMenos.price) / Math.max(match.maxiPali.price, match.masxMenos.price)) * 100)}%)
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
