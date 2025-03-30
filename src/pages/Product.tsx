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
  Scale,
  Loader
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { compareProductPrices } from "@/lib/services";
import { Product as ProductType } from "@/lib/types/store";
import { getOrCreateDefaultList, addProductToGroceryList } from "@/lib/services/groceryListService";
import { formatCurrency } from "@/utils/currencyUtils";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

// Price type for the PriceComparison component
interface Price {
  storeId: string;
  price: number;
  currency: string;
  date: string;
}

// Added Walmart to the possible matches
interface MatchedProducts {
  maxiPali: ProductType | null; 
  masxMenos: ProductType | null;
  walmart: ProductType | null;
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

// Walmart Product Display Component
const WalmartProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      product 
        ? (isLowestPrice 
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
          : "")
        : "border-dashed border-muted"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-white" />
        </div>
        <h4 className="font-medium text-lg">Walmart</h4>
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
            Product not available at Walmart
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
  const [walmartProduct, setWalmartProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    bestPrice: {
      store: 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Unknown';
      price: number;
      savings: number;
      savingsPercentage: number;
    } | null;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matchedProducts, setMatchedProducts] = useState<MatchedProducts[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("compare");

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
        setWalmartProduct(null);
        
        // Search by the ID, which could be a name or barcode
        console.log(`Fetching comparison for product: ${productId} from original store: ${originalStore || 'unknown'}`);
        const result = await compareProductPrices(productId, undefined, originalStore);
        
        console.log("API comparison results:", result);
        
        // Filter out products with zero price
        const validMaxiPaliProducts = result.maxiPaliProducts.filter(p => p.price > 0);
        const validMasxMenosProducts = result.masxMenosProducts.filter(p => p.price > 0);
        const validWalmartProducts = result.walmartProducts.filter(p => p.price > 0);
        
        console.log(`Valid MaxiPali products: ${validMaxiPaliProducts.length}`);
        console.log(`Valid MasxMenos products: ${validMasxMenosProducts.length}`);
        console.log(`Valid Walmart products: ${validWalmartProducts.length}`);

        // Find best matching products by name similarity
        let bestMatches: MatchedProducts[] = [];
        
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
        
        // Function to match products across all three stores
        const findBestMatches = () => {
          // Initialize sets to track which products have been matched
          const usedMaxiPali = new Set<string>();
          const usedMasxMenos = new Set<string>();
          const usedWalmart = new Set<string>();
          
          // Create all possible product pairs with similarity scores
          const allPairs: Array<{
            products: [ProductType, ProductType];
            stores: [string, string];
            similarity: number;
          }> = [];
          
          // Compare MaxiPali and MasxMenos
          validMaxiPaliProducts.forEach(maxiProd => {
            validMasxMenosProducts.forEach(masxProd => {
              const similarity = getProductSimilarity(maxiProd, masxProd);
              if (similarity >= 50) {
                allPairs.push({
                  products: [maxiProd, masxProd],
                  stores: ['maxiPali', 'masxMenos'],
                  similarity
                });
              }
            });
          });
          
          // Compare MaxiPali and Walmart
          validMaxiPaliProducts.forEach(maxiProd => {
            validWalmartProducts.forEach(walmartProd => {
              const similarity = getProductSimilarity(maxiProd, walmartProd);
              if (similarity >= 50) {
                allPairs.push({
                  products: [maxiProd, walmartProd],
                  stores: ['maxiPali', 'walmart'],
                  similarity
                });
              }
            });
          });
          
          // Compare MasxMenos and Walmart
          validMasxMenosProducts.forEach(masxProd => {
            validWalmartProducts.forEach(walmartProd => {
              const similarity = getProductSimilarity(masxProd, walmartProd);
              if (similarity >= 50) {
                allPairs.push({
                  products: [masxProd, walmartProd],
                  stores: ['masxMenos', 'walmart'],
                  similarity
                });
              }
            });
          });
          
          // Sort pairs by similarity
          allPairs.sort((a, b) => b.similarity - a.similarity);
          
          // Create a map to track matches by product ID
          const matchMap = new Map<string, MatchedProducts>();
          
          // Process pairs in order of similarity
          allPairs.forEach(pair => {
            const [prod1, prod2] = pair.products;
            const [store1, store2] = pair.stores;
            
            // Skip if either product is already used
            if ((store1 === 'maxiPali' && usedMaxiPali.has(prod1.id)) ||
                (store1 === 'masxMenos' && usedMasxMenos.has(prod1.id)) ||
                (store1 === 'walmart' && usedWalmart.has(prod1.id)) ||
                (store2 === 'maxiPali' && usedMaxiPali.has(prod2.id)) ||
                (store2 === 'masxMenos' && usedMasxMenos.has(prod2.id)) ||
                (store2 === 'walmart' && usedWalmart.has(prod2.id))) {
              return;
            }
            
            // Mark these products as used
            if (store1 === 'maxiPali') usedMaxiPali.add(prod1.id);
            if (store1 === 'masxMenos') usedMasxMenos.add(prod1.id);
            if (store1 === 'walmart') usedWalmart.add(prod1.id);
            
            if (store2 === 'maxiPali') usedMaxiPali.add(prod2.id);
            if (store2 === 'masxMenos') usedMasxMenos.add(prod2.id);
            if (store2 === 'walmart') usedWalmart.add(prod2.id);
            
            // Check if either product is already in a match
            const matchId1 = `${store1}-${prod1.id}`;
            const matchId2 = `${store2}-${prod2.id}`;
            
            let match: MatchedProducts | undefined;
            
            if (matchMap.has(matchId1)) {
              match = matchMap.get(matchId1);
            } else if (matchMap.has(matchId2)) {
              match = matchMap.get(matchId2);
            } else {
              // Create a new match
              match = {
                maxiPali: null,
                masxMenos: null,
                walmart: null
              };
            }
            
            if (match) {
              // Add the products to the match
              if (store1 === 'maxiPali') match.maxiPali = prod1;
              if (store1 === 'masxMenos') match.masxMenos = prod1;
              if (store1 === 'walmart') match.walmart = prod1;
              
              if (store2 === 'maxiPali') match.maxiPali = prod2;
              if (store2 === 'masxMenos') match.masxMenos = prod2;
              if (store2 === 'walmart') match.walmart = prod2;
              
              // Update the match map
              matchMap.set(matchId1, match);
              matchMap.set(matchId2, match);
            }
          });
          
          // Convert the map to an array of matches
          const matchesArray = Array.from(new Set(matchMap.values()));
          
          // Add unmatched products
          validMaxiPaliProducts.forEach(prod => {
            if (!usedMaxiPali.has(prod.id)) {
              matchesArray.push({
                maxiPali: prod,
                masxMenos: null,
                walmart: null
              });
            }
          });
          
          validMasxMenosProducts.forEach(prod => {
            if (!usedMasxMenos.has(prod.id)) {
              matchesArray.push({
                maxiPali: null,
                masxMenos: prod,
                walmart: null
              });
            }
          });
          
          validWalmartProducts.forEach(prod => {
            if (!usedWalmart.has(prod.id)) {
              matchesArray.push({
                maxiPali: null,
                masxMenos: null,
                walmart: prod
              });
            }
          });
          
          return matchesArray;
        };
        
        // Find the best matches
        bestMatches = findBestMatches();
        
        // Get the best matching products from each store with prefixed IDs to help React distinguish them
        let bestMaxiPaliMatch = validMaxiPaliProducts.length > 0 ? 
          { ...validMaxiPaliProducts[0], id: `maxipali-${validMaxiPaliProducts[0].id}` } : null;
        let bestMasxMenosMatch = validMasxMenosProducts.length > 0 ? 
          { ...validMasxMenosProducts[0], id: `masxmenos-${validMasxMenosProducts[0].id}` } : null;
        let bestWalmartMatch = validWalmartProducts.length > 0 ? 
          { ...validWalmartProducts[0], id: `walmart-${validWalmartProducts[0].id}` } : null;
        
        console.log("Setting MaxiPali product:", bestMaxiPaliMatch);
        console.log("Setting MasxMenos product:", bestMasxMenosMatch);
        console.log("Setting Walmart product:", bestWalmartMatch);
        console.log("Best matches:", bestMatches);
        
        // Force the component to recognize these as new objects by using a small delay to break React batching
        setTimeout(() => {
          setMaxiPaliProduct(bestMaxiPaliMatch);
          setMasxMenosProduct(bestMasxMenosMatch);
          setWalmartProduct(bestWalmartMatch);
          setMatchedProducts(bestMatches);
        }, 50);
        
        // Store the best price from the API
        setCompareResult({
          bestPrice: result.bestPrice
        });
        
        // Show toast notification based on search results
        if (!bestMaxiPaliMatch && !bestMasxMenosMatch && !bestWalmartMatch) {
          toast({
            title: "No products found",
            description: "Could not find this product in any store.",
            variant: "destructive"
          });
        } else {
          const foundStores = [
            bestMaxiPaliMatch ? 'MaxiPali' : null,
            bestMasxMenosMatch ? 'MasxMenos' : null,
            bestWalmartMatch ? 'Walmart' : null
          ].filter(Boolean);
          
          if (foundStores.length === 1) {
            toast({
              description: `Product found only in ${foundStores[0]}.`
            });
          } else if (foundStores.length > 1) {
            toast({
              description: `Product found in ${foundStores.length} stores. Compare prices below!`
            });
          }
        }
      } catch (error) {
        console.error("Error fetching product comparison:", error);
        toast({
          title: "Error",
          description: "Failed to load product comparison.",
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
  
  useEffect(() => {
    console.log("walmartProduct state updated:", walmartProduct);
  }, [walmartProduct]);

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

    if (!maxiPaliProduct && !masxMenosProduct && !walmartProduct) {
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
      } else if (compareResult?.bestPrice?.store === 'Walmart' && walmartProduct) {
        productToAdd = walmartProduct;
      } else {
        // If no best price or the preferred store doesn't have the product,
        // use whatever product is available
        productToAdd = maxiPaliProduct || masxMenosProduct || walmartProduct;
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
    const productName = maxiPaliProduct?.name || masxMenosProduct?.name || walmartProduct?.name || 'Product';
    
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
    console.log("Walmart product:", walmartProduct);
    
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
    
    // Always add Walmart data with consistent ID
    const walmartPrice: Price = {
      storeId: 'walmart', // Ensure lowercase consistent with stores.find lookup
      price: walmartProduct?.price || 0,
      currency: '₡',
      date: new Date().toISOString()
    };
    console.log("Adding Walmart price:", walmartPrice);
    prices.push(walmartPrice);
    
    console.log("Final price comparison data:", prices);
    return prices;
  };

  const calculateSavings = () => {
    if (!maxiPaliProduct || !masxMenosProduct || !walmartProduct) return null;
    
    const maxiPaliPrice = maxiPaliProduct.price || 0;
    const masxMenosPrice = masxMenosProduct.price || 0;
    const walmartPrice = walmartProduct.price || 0;
    
    if (maxiPaliPrice === 0 || masxMenosPrice === 0 || walmartPrice === 0) return null;
    
    let bestPrice = null;
    
    // Compare prices and calculate savings
    if (maxiPaliPrice < masxMenosPrice && maxiPaliPrice < walmartPrice) {
      const savingsAmount = maxiPaliPrice;
      const savingsPercentage = 0;
      bestPrice = {
        store: 'MaxiPali',
        price: savingsAmount,
        savings: savingsAmount,
        savingsPercentage
      };
    } else if (masxMenosPrice < maxiPaliPrice && masxMenosPrice < walmartPrice) {
      const savingsAmount = masxMenosPrice;
      const savingsPercentage = 0;
      bestPrice = {
        store: 'MasxMenos',
        price: savingsAmount,
        savings: savingsAmount,
        savingsPercentage
      };
    } else if (walmartPrice < maxiPaliPrice && walmartPrice < masxMenosPrice) {
      const savingsAmount = walmartPrice;
      const savingsPercentage = 0;
      bestPrice = {
        store: 'Walmart',
        price: savingsAmount,
        savings: savingsAmount,
        savingsPercentage
      };
    } else {
      // If prices are equal, choose MaxiPali
      bestPrice = {
        store: 'MaxiPali',
        price: maxiPaliPrice,
        savings: 0,
        savingsPercentage: 0
      };
    }
    
    return bestPrice;
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

  if (!maxiPaliProduct && !masxMenosProduct && !walmartProduct) {
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
    : (maxiPaliProduct || masxMenosProduct || walmartProduct);

  const bestPrice = calculateSavings();

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
                {/* Show savings summary if at least two stores have the product */}
                {bestPrice && bestPrice.store && (maxiPaliProduct || masxMenosProduct || walmartProduct) && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/20 dark:border-green-900/30">
                    <h4 className="text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                      <ArrowDown className="w-4 h-4" /> 
                      Best Price at {bestPrice.store}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {bestPrice.store} offers the best price at {formatCurrency(bestPrice.price, "CRC")}.
                      {bestPrice.savingsPercentage > 0 && ` Save up to ${bestPrice.savingsPercentage}% compared to other stores.`}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Debug info */}
                  {process.env.NODE_ENV !== 'production' && (
                    <div className="col-span-3 mb-4 p-3 bg-gray-100 border border-gray-200 rounded text-xs font-mono overflow-auto max-h-32">
                      <div>MaxiPali: {maxiPaliProduct ? '✅' : '❌'}</div>
                      <div>MasxMenos: {masxMenosProduct ? '✅' : '❌'}</div>
                      <div>Walmart: {walmartProduct ? '✅' : '❌'}</div>
                      <div>MaxiPali Name: {maxiPaliProduct?.name || 'N/A'}</div>
                      <div>MaxiPali ID: {maxiPaliProduct?.id || 'N/A'}</div>
                      <div>MaxiPali Price: {maxiPaliProduct?.price || 'N/A'}</div>
                    </div>
                  )}
                
                  {/* MaxiPali product */}
                  <MaxiPaliProductDisplay product={maxiPaliProduct} isLowestPrice={compareResult?.bestPrice?.store === "MaxiPali"} />
                  
                  {/* MasxMenos product */}
                  <MasxMenosProductDisplay product={masxMenosProduct} isLowestPrice={compareResult?.bestPrice?.store === "MasxMenos"} />
                  
                  {/* Walmart product */}
                  <WalmartProductDisplay product={walmartProduct} isLowestPrice={compareResult?.bestPrice?.store === "Walmart"} />
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        
                        {/* Walmart product */}
                        <div className={cn(
                          "p-4 rounded-lg border",
                          match.walmart ? "border-blue-200" : "border-dashed border-muted"
                        )}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Store className="w-3 h-3 text-white" />
                            </div>
                            <h4 className="font-medium">Walmart</h4>
                          </div>
                          
                          {match.walmart ? (
                            <div className="space-y-2">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                                  <img 
                                    src={match.walmart.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={match.walmart.name} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium line-clamp-2">{match.walmart.name}</p>
                                  <p className="text-sm text-muted-foreground">{match.walmart.brand || 'Unknown brand'}</p>
                                  <div className="font-semibold">
                                    ₡{match.walmart.price.toLocaleString('es-CR')}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => handleAddMatchedProduct(match.walmart)}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add to List
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center">
                              <p className="text-muted-foreground">
                                Product not available at Walmart
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Price comparison and savings */}
                      {(match.maxiPali && match.masxMenos) || (match.maxiPali && match.walmart) || (match.masxMenos && match.walmart) ? (
                        <div className="mt-3 pt-3 border-t">
                          {/* MaxiPali vs MasxMenos */}
                          {match.maxiPali && match.masxMenos && match.maxiPali.price !== match.masxMenos.price && (
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">MaxiPali vs MasxMenos:</span>
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
                          
                          {/* MaxiPali vs Walmart */}
                          {match.maxiPali && match.walmart && match.maxiPali.price !== match.walmart.price && (
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">MaxiPali vs Walmart:</span>
                              <Badge 
                                variant={match.maxiPali.price < match.walmart.price ? "secondary" : "default"}
                                className={cn(
                                  "font-normal",
                                  match.maxiPali.price < match.walmart.price 
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                )}
                              >
                                {match.maxiPali.price < match.walmart.price ? 'MaxiPali cheaper by' : 'Walmart cheaper by'} 
                                {' '}₡{Math.abs(match.maxiPali.price - match.walmart.price).toLocaleString('es-CR')}
                                {' '}({Math.round((Math.abs(match.maxiPali.price - match.walmart.price) / Math.max(match.maxiPali.price, match.walmart.price)) * 100)}%)
                              </Badge>
                            </div>
                          )}
                          
                          {/* MasxMenos vs Walmart */}
                          {match.masxMenos && match.walmart && match.masxMenos.price !== match.walmart.price && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">MasxMenos vs Walmart:</span>
                              <Badge 
                                variant={match.masxMenos.price < match.walmart.price ? "secondary" : "default"}
                                className={cn(
                                  "font-normal",
                                  match.masxMenos.price < match.walmart.price 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                )}
                              >
                                {match.masxMenos.price < match.walmart.price ? 'MasxMenos cheaper by' : 'Walmart cheaper by'} 
                                {' '}₡{Math.abs(match.masxMenos.price - match.walmart.price).toLocaleString('es-CR')}
                                {' '}({Math.round((Math.abs(match.masxMenos.price - match.walmart.price) / Math.max(match.masxMenos.price, match.walmart.price)) * 100)}%)
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : null}
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
