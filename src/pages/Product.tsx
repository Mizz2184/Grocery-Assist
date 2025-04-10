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
  Loader,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { compareProductPrices } from "@/lib/services";
import { Product as ProductType } from "@/lib/types/store";
import { getOrCreateDefaultList, addProductToGroceryList } from "@/lib/services/groceryListService";
import { formatCurrency } from "@/utils/currencyUtils";
import { formatPrice } from "@/lib/utils/currency";
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
import { useTranslation } from "@/context/TranslationContext";
import { TranslatedText } from "@/App";

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
  const { translateTitle, translateText } = useTranslation();
  
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
            <TranslatedText es="Mejor Precio" en="Best Price" />
          </Badge>
        )}
      </div>
      
      {product ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                alt={translateTitle(product.name)} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium line-clamp-2">{translateTitle(product.name)}</p>
              <p className="text-sm text-muted-foreground">{translateText(product.brand) || translateText('Marca desconocida')}</p>
            </div>
          </div>
          <div className="font-bold text-lg">
            {formatPrice(product.price)}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            <TranslatedText es="Producto no disponible en MaxiPali" en="Product not available at MaxiPali" />
          </p>
        </div>
      )}
    </div>
  );
};

const MasxMenosProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  const { translateTitle, translateText } = useTranslation();
  
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
            <TranslatedText es="Mejor Precio" en="Best Price" />
          </Badge>
        )}
      </div>
      
      {product ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                alt={translateTitle(product.name)} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium line-clamp-2">{translateTitle(product.name)}</p>
              <p className="text-sm text-muted-foreground">{translateText(product.brand) || translateText('Marca desconocida')}</p>
            </div>
          </div>
          <div className="font-bold text-lg">
            {formatPrice(product.price)}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            <TranslatedText es="Producto no disponible en MasxMenos" en="Product not available at MasxMenos" />
          </p>
        </div>
      )}
    </div>
  );
};

// Walmart Product Display Component
const WalmartProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  const { translateTitle, translateText } = useTranslation();
  
  console.log('WalmartProductDisplay component rendering with product:', product);
  
  if (!product) {
    console.log('No Walmart product available to display');
    return (
      <div className="product-not-found">
        <div className="text-center p-4">
          <h3 className="text-lg font-medium mb-2">
            <TranslatedText es="No se encontró producto similar en Walmart" en="No matching product found at Walmart" />
          </h3>
          <p className="text-muted-foreground">
            <TranslatedText es="No pudimos encontrar un producto similar en Walmart." en="We couldn't find a similar product at Walmart." />
          </p>
        </div>
      </div>
    );
  }

  const isBestPrice = isLowestPrice;
  console.log('Is Walmart product the best price?', isBestPrice);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      product 
        ? (isBestPrice 
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
          : "")
        : "border-dashed border-muted"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-white" />
        </div>
        <h4 className="font-medium text-lg">Walmart</h4>
        {product && isBestPrice && (
          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-100">
            <TranslatedText es="Mejor Precio" en="Best Price" />
          </Badge>
        )}
      </div>
      
      {product ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                alt={translateTitle(product.name)} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium line-clamp-2">{translateTitle(product.name)}</p>
              <p className="text-sm text-muted-foreground">{translateText(product.brand) || translateText('Marca desconocida')}</p>
            </div>
          </div>
          <div className="font-bold text-lg">
            {formatPrice(product.price)}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            <TranslatedText es="Producto no disponible en Walmart" en="Product not available at Walmart" />
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
  const { translateTitle, translateDescription, translateText, translateUI } = useTranslation();

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

  // Function to get the product to add based on best price
  const getProductToAdd = (): ProductType | null => {
    if (compareResult?.bestPrice?.store === 'MaxiPali' && maxiPaliProduct) {
      return maxiPaliProduct;
    } else if (compareResult?.bestPrice?.store === 'MasxMenos' && masxMenosProduct) {
      return masxMenosProduct;
    } else if (compareResult?.bestPrice?.store === 'Walmart' && walmartProduct) {
      return walmartProduct;
    } else {
      // If no best price or the preferred store doesn't have the product,
      // use whatever product is available
      return maxiPaliProduct || masxMenosProduct || walmartProduct;
    }
  };

  const handleAddToList = async () => {
    if (!user) {
      toast({
        title: translateUI("Debe iniciar sesión"),
        description: translateUI("Por favor inicie sesión para agregar productos a su lista"),
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      // Always use the best price product from any store
      const productToAdd = getProductToAdd();
      
      if (!productToAdd) {
      toast({
          title: translateUI("Error"),
          description: translateUI("No se pudo agregar el producto a la lista"),
          variant: "destructive"
      });
      return;
    }

      const defaultList = await getOrCreateDefaultList(user.id);
      if (!defaultList) {
        throw new Error(translateUI("No se pudo encontrar o crear una lista de compras predeterminada"));
      }
      
      await addProductToGroceryList(defaultList.id, user.id, productToAdd);
      
      setIsInList(true);
      toast({
        title: translateUI("Producto agregado"),
        description: translateUI("Producto agregado a tu lista de compras"),
      });
    } catch (error) {
      console.error("Error adding product to list:", error);
      toast({
        title: translateUI("Error"),
        description: translateUI("No se pudo agregar el producto a la lista"),
        variant: "destructive"
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
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <TranslatedText es="Volver a resultados" en="Back to results" />
            </Button>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main product information */}
            {mainProduct && (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 w-full md:w-1/3 aspect-square rounded-xl border bg-white dark:bg-slate-950 p-4 flex items-center justify-center">
            <img 
              src={mainProduct.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                    alt={translateTitle(mainProduct.name)}
                    className="max-h-full max-w-full object-contain"
            />
            </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">
                      {translateTitle(mainProduct.name)}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-muted-foreground">
                        {translateText(mainProduct.brand) || translateText('Marca desconocida')}
                      </p>
            {compareResult?.bestPrice && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100">
                          <TranslatedText es={`Es más barato en ${compareResult.bestPrice.store}`} en={`It's cheaper at ${compareResult.bestPrice.store}`} />
                </Badge>
            )}
                    </div>
          </div>
          
                  <div className="flex flex-wrap items-center gap-4">
            <div>
                      <p className="text-sm text-muted-foreground">
                        <TranslatedText es="Precio" en="Price" />
                      </p>
                      <p className="text-3xl font-bold">
                        {mainProduct.price ? formatCurrency(mainProduct.price) : 
                          <TranslatedText es="Precio no disponible" en="Price not available" />
                        }
                      </p>
              </div>
                    
                    {compareResult?.bestPrice && compareResult.bestPrice.savings > 0 && (
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          <TranslatedText es="Ahorro" en="Savings" />
                        </p>
                        <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(compareResult.bestPrice.savings)} ({compareResult.bestPrice.savingsPercentage.toFixed(0)}%)
                        </p>
                      </div>
                    )}
            </div>
            
                  <div className="pt-4 flex gap-2">
            <Button
              onClick={handleAddToList}
                      disabled={isAdding || isInList}
                      className="flex-1"
            >
                      {isAdding ? (
                <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          <TranslatedText es="Agregando..." en="Adding..." />
                </>
                      ) : isInList ? (
                <>
                          <Check className="mr-2 h-4 w-4" />
                          <TranslatedText es="Añadido a la lista" en="Added to list" />
                </>
              ) : (
                <>
                          <Plus className="mr-2 h-4 w-4" />
                          <TranslatedText es="Añadir a la lista" en="Add to list" />
                </>
              )}
            </Button>
            
                    <Button
                      variant="outline"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only">
                        <TranslatedText es="Compartir" en="Share" />
                      </span>
                    </Button>
              </div>
              
                  {/* Product description if available */}
                  {mainProduct.description && (
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-2">
                        <TranslatedText es="Descripción" en="Description" />
                      </h3>
                      <p className="text-muted-foreground">
                        {translateDescription(mainProduct.description)}
                      </p>
                    </div>
                  )}
                </div>
                  </div>
                )}
                
            {/* Tabs for price comparison and alternatives */}
            <Tabs defaultValue="comparison">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="comparison">
                  <Scale className="h-4 w-4 mr-2" />
                  <TranslatedText es="Comparar Precios" en="Compare Prices" />
                </TabsTrigger>
                {matchedProducts.length > 0 && (
                  <TabsTrigger value="alternatives">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    <TranslatedText es="Alternativas" en="Alternatives" />
                    <span className="ml-2 text-xs rounded-full bg-secondary px-2 py-0.5">
                      {matchedProducts.length}
                    </span>
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="comparison" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MaxiPaliProductDisplay 
                    product={maxiPaliProduct} 
                    isLowestPrice={compareResult?.bestPrice?.store === 'MaxiPali' || false} 
                  />
                  <MasxMenosProductDisplay 
                    product={masxMenosProduct} 
                    isLowestPrice={compareResult?.bestPrice?.store === 'MasxMenos' || false} 
                  />
                  <WalmartProductDisplay 
                    product={walmartProduct} 
                    isLowestPrice={compareResult?.bestPrice?.store === 'Walmart' || false} 
                  />
                </div>
                
                {/* Show PriceComparison component if we have prices */}
                {getPriceComparisonData().length > 0 && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>
                        <TranslatedText es="Historial de Precios" en="Price History" />
                      </CardTitle>
                      <CardDescription>
                        <TranslatedText es="Comparación de precios entre tiendas" en="Price comparison between stores" />
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PriceComparison prices={getPriceComparisonData()} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="alternatives" className="space-y-4 pt-4">
                <h3 className="text-lg font-medium">
                  <TranslatedText es="Productos Similares" en="Similar Products" />
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {matchedProducts.map((match, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-3">
                          {/* Display details for each store in the match */}
                          {match.maxiPali && (
                            <div className="border-b md:border-b-0 md:border-r p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                                  <Store className="w-3 h-3 text-black" />
                                </div>
                                <h4 className="font-medium text-sm">MaxiPali</h4>
                              </div>
                              <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                        <img 
                                    src={match.maxiPali.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={translateTitle(match.maxiPali.name)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                          <div>
                                  <p className="font-medium text-sm line-clamp-2">{translateTitle(match.maxiPali.name)}</p>
                                  <p className="text-xs text-muted-foreground">{translateText(match.maxiPali.brand) || translateText('Marca desconocida')}</p>
                                  <p className="font-bold mt-1">₡{match.maxiPali.price.toLocaleString('es-CR')}</p>
                          </div>
                          </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-full"
                                onClick={() => handleAddMatchedProduct(match.maxiPali!)}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                <TranslatedText es="Añadir" en="Add" />
                              </Button>
                    </div>
                  )}
                  
                          {match.masxMenos && (
                            <div className="border-b md:border-b-0 md:border-r p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                                  <Store className="w-3 h-3 text-white" />
                                </div>
                                <h4 className="font-medium text-sm">MasxMenos</h4>
                              </div>
                              <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                        <img 
                                    src={match.masxMenos.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={translateTitle(match.masxMenos.name)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                          <div>
                                  <p className="font-medium text-sm line-clamp-2">{translateTitle(match.masxMenos.name)}</p>
                                  <p className="text-xs text-muted-foreground">{translateText(match.masxMenos.brand) || translateText('Marca desconocida')}</p>
                                  <p className="font-bold mt-1">₡{match.masxMenos.price.toLocaleString('es-CR')}</p>
                          </div>
                          </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-full"
                                onClick={() => handleAddMatchedProduct(match.masxMenos!)}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                <TranslatedText es="Añadir" en="Add" />
                              </Button>
                    </div>
                  )}
                  
                          {match.walmart && (
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                  <Store className="w-3 h-3 text-white" />
                      </div>
                                <h4 className="font-medium text-sm">Walmart</h4>
                        </div>
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                                  <img 
                                    src={match.walmart.imageUrl || 'https://placehold.co/400?text=No+Image'} 
                                    alt={translateTitle(match.walmart.name)}
                                    className="w-full h-full object-cover"
                                  />
                      </div>
                        <div>
                                  <p className="font-medium text-sm line-clamp-2">{translateTitle(match.walmart.name)}</p>
                                  <p className="text-xs text-muted-foreground">{translateText(match.walmart.brand) || translateText('Marca desconocida')}</p>
                                  <p className="font-bold mt-1">₡{match.walmart.price.toLocaleString('es-CR')}</p>
                        </div>
                      </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-full"
                                onClick={() => handleAddMatchedProduct(match.walmart!)}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                <TranslatedText es="Añadir" en="Add" />
                              </Button>
                    </div>
                  )}
                </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
              </TabsContent>
            </Tabs>
            </div>
        )}
                      </div>
    </div>
  );
};

export default Product;
