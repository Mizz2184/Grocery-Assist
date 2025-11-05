import { useEffect, useState, useMemo } from "react";
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
  ShoppingCart,
  Minus
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
import { useSearchNavigation } from "@/hooks/useSearchNavigation";

// Price type for the PriceComparison component
interface Price {
  storeId: string;
  price: number;
  currency: string;
  date: string;
}

// Added Walmart and Automercado to the possible matches
interface MatchedProducts {
  maxiPali?: ProductType | null; 
  masxMenos?: ProductType | null;
  walmart?: ProductType | null;
  automercado?: ProductType | null;
}

// Function to calculate similarity between product names
// This helper should be defined before the Product component
const getProductSimilarity = (product1: ProductType, product2: ProductType): number => {
  if (!product1 || !product2) return 0;
  
  // Enable this for detailed debug logs
  const DEBUG_SIMILARITY = true;
  
  // Special logging for the coffee product from the screenshot
  const isQuetzalCoffee = (product: ProductType) => 
    product.name.toLowerCase().includes('quetzal') && 
    product.name.toLowerCase().includes('cafe');
    
  // Add extra logging for the coffee product in the screenshot
  if (isQuetzalCoffee(product1) || isQuetzalCoffee(product2)) {
    console.log(`%c Comparing Quetzal Coffee products! `, 'background: #ff9800; color: white; padding: 2px 5px; border-radius: 3px;');
    console.log(`Product 1: ${product1.name} (${product1.store || 'unknown store'})`);
    console.log(`Product 2: ${product2.name} (${product2.store || 'unknown store'})`);
  }
  
  if (DEBUG_SIMILARITY) {
    console.log(`Comparing products: 
      - Product 1: ${product1.name} (${product1.store || 'unknown store'})
      - Product 2: ${product2.name} (${product2.store || 'unknown store'})
    `);
  }
  
  // Helper function to normalize strings for comparison
  const normalizeString = (str: string): string => {
    return (str || '')
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/g, '') // Remove special chars
      .trim();
  };
  
  // Calculate partial similarity score between two strings (0-100)
  const getStringSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);
    
    // For very short strings, prioritize exact matches or containment
    if (norm1.length < 5 || norm2.length < 5) {
      if (norm1 === norm2) return 100;
      if (norm1.includes(norm2) || norm2.includes(norm1)) return 80;
      return 0;
    }
    
    // Create word sets for comparison
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    
    // Count matching words
    let matchCount = 0;
    for (const word of words1) {
      // Check for exact word match
      if (words2.has(word)) {
        matchCount += 1;
        continue;
      }
      
      // Check if any word in words2 contains this word (for partial matches)
      for (const word2 of words2) {
        if (word2.includes(word) || word.includes(word2)) {
          matchCount += 0.5;
          break;
        }
      }
    }
    
    // Calculate similarity percentage
    const totalUniqueWords = words1.size + words2.size - matchCount;
    return totalUniqueWords > 0 
      ? (matchCount / totalUniqueWords) * 100 
      : (words1.size === 0 && words2.size === 0) ? 0 : 100;
  };

  // Extract product type/category by keywords in the name
  const detectProductCategory = (name: string): string | null => {
    const normalizedName = normalizeString(name);
    
    // Common food product types
    if (normalizedName.includes('cafe') || normalizedName.includes('coffee')) return 'coffee';
    if (normalizedName.includes('arroz') || normalizedName.includes('rice')) return 'rice';
    if (normalizedName.includes('frijol') || normalizedName.includes('beans')) return 'beans';
    if (normalizedName.includes('leche') || normalizedName.includes('milk')) return 'milk';
    if (normalizedName.includes('azucar') || normalizedName.includes('sugar')) return 'sugar';
    
    return null;
  };
  
  // Check if products are from the same brand
  const sameBrand = product1.brand && 
                    product2.brand && 
                    normalizeString(product1.brand) === normalizeString(product2.brand);
  
  // Calculate name similarity (most important)
  const nameSimilarity = getStringSimilarity(product1.name, product2.name);
  
  // Calculate description similarity if available
  const descriptionSimilarity = product1.description && product2.description
    ? getStringSimilarity(product1.description, product2.description)
    : 0;
  
  // Check for weight/volume pattern in names - improved to catch more formats
  const extractMeasurement = (name: string): string | null => {
    // Look for patterns like 275gr, 275g, 275 g, 275 gr, 275gram, etc.
    const matches = name.match(/(\d+[\s-]*(kg|g|gr|gram|gramos|ml|l|litro|oz|onza)s?)\b/i);
    return matches ? matches[0].toLowerCase() : null;
  };
  
  const measurement1 = extractMeasurement(product1.name);
  const measurement2 = extractMeasurement(product2.name);
  
  // Normalize the measurements for better comparison
  const normalizeMeasurement = (measurement: string | null): number | null => {
    if (!measurement) return null;
    
    // Extract the number
    const numMatch = measurement.match(/(\d+)/);
    if (!numMatch) return null;
    
    const value = parseInt(numMatch[0], 10);
    
    // Convert to a standard unit (grams)
    if (measurement.includes('kg')) return value * 1000;
    if (measurement.includes('g') || measurement.includes('gr') || measurement.includes('gram')) return value;
    
    return value; // If we can't normalize, just return the number
  };
  
  const normalizedMeasurement1 = normalizeMeasurement(measurement1);
  const normalizedMeasurement2 = normalizeMeasurement(measurement2);
  
  // Measurements are the same if they're within 5% of each other
  const similarMeasurement = normalizedMeasurement1 && normalizedMeasurement2 && 
    Math.abs(normalizedMeasurement1 - normalizedMeasurement2) / Math.max(normalizedMeasurement1, normalizedMeasurement2) <= 0.05;
  
  // Check if both products are of the same category
  const category1 = detectProductCategory(product1.name);
  const category2 = detectProductCategory(product2.name);
  const sameCategory = category1 && category2 && category1 === category2;
  
  if (DEBUG_SIMILARITY) {
    console.log(`Similarity analysis:
      - Name similarity: ${nameSimilarity.toFixed(1)}%
      - Description similarity: ${descriptionSimilarity.toFixed(1)}%
      - Same brand: ${sameBrand ? 'Yes' : 'No'}
      - Product 1 measurement: ${measurement1 || 'none detected'} (normalized: ${normalizedMeasurement1})
      - Product 2 measurement: ${measurement2 || 'none detected'} (normalized: ${normalizedMeasurement2})
      - Similar measurement: ${similarMeasurement ? 'Yes' : 'No'}
      - Product 1 category: ${category1 || 'unknown'}
      - Product 2 category: ${category2 || 'unknown'}
      - Same category: ${sameCategory ? 'Yes' : 'No'}
    `);
  }
  
  // Combine all factors to calculate final similarity score
  let finalScore = nameSimilarity * 0.6; // Name similarity (60%)
  
  // Add bonus for same brand (20% boost)
  if (sameBrand) finalScore += 20;
  
  // Add bonus for similar measurements (15% boost)
  if (similarMeasurement) finalScore += 15;
  
  // Add bonus for same category (10% boost)
  if (sameCategory) finalScore += 10;
  
  // Special handling for coffee products - they often have similar sizes but different names
  // If both are coffees with similar weight, increase similarity
  if (category1 === 'coffee' && category2 === 'coffee' && similarMeasurement) {
    finalScore += 15; // Additional boost for coffee products with same weight
  }
  
  // Factor in description similarity but with less weight (10%)
  if (descriptionSimilarity > 0) {
    finalScore = (finalScore * 0.9) + (descriptionSimilarity * 0.1);
  }
  
  // Lower the threshold for matching for coffee products
  if (category1 === 'coffee' && category2 === 'coffee') {
    finalScore = Math.min(finalScore * 1.2, 100); // 20% boost for coffee products
  }
  
  // Cap at 100
  const result = Math.min(Math.round(finalScore), 100);
  
  if (DEBUG_SIMILARITY) {
    console.log(`Final similarity score: ${result}%`);
    
    // Highlight high-scoring matches for Quetzal coffee
    if ((isQuetzalCoffee(product1) || isQuetzalCoffee(product2)) && result >= 35) {
      console.log(`%c POTENTIAL QUETZAL COFFEE MATCH (${result}%) `, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      console.log(`Product 1: ${product1.name} (${product1.store || 'unknown store'})`);
      console.log(`Product 2: ${product2.name} (${product2.store || 'unknown store'})`);
    }
    
    // For coffee products show a divider to make logs easier to read
    if (product1.name.toLowerCase().includes('cafe') || product2.name.toLowerCase().includes('cafe')) {
      console.log('-'.repeat(50));
    }
  }
  
  return result;
};

// Create separate store product display components to better handle the rendering
const MaxiPaliProductDisplay = ({ product, isLowestPrice }: { product: ProductType | null, isLowestPrice: boolean }) => {
  const { translateTitle, translateText } = useTranslation();
  
  // Strong verification for MaxiPali products
  if (product && product.store && product.store !== 'MaxiPali') {
    console.error(`ERROR: Non-MaxiPali product displayed in MaxiPali component:`, product);
    return null; // Don't display products from the wrong store
  }
  
  console.log('MaxiPaliProductDisplay rendering - isLowestPrice:', isLowestPrice, 'product:', product?.name);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isLowestPrice && product 
          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" 
        : product ? "" : "border-dashed border-muted"
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
  
  // Strong verification for MasxMenos products
  if (product && product.store && product.store !== 'MasxMenos') {
    console.error(`ERROR: Non-MasxMenos product displayed in MasxMenos component:`, product);
    return null; // Don't display products from the wrong store
  }
  
  console.log('MasxMenosProductDisplay rendering - isLowestPrice:', isLowestPrice, 'product:', product?.name);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isLowestPrice && product 
          ? "border-green-400 bg-green-50 dark:bg-green-900/20" 
        : product ? "" : "border-dashed border-muted"
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
  
  // Strong verification for Walmart products
  if (product && product.store && product.store !== 'Walmart') {
    console.error(`ERROR: Non-Walmart product displayed in Walmart component:`, product);
    return null; // Don't display products from the wrong store
  }
  
  console.log('WalmartProductDisplay rendering - isLowestPrice:', isLowestPrice, 'product:', product?.name);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isLowestPrice && product 
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
        : product ? "" : "border-dashed border-muted"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-white" />
        </div>
        <h4 className="font-medium text-lg">Walmart</h4>
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
  const [quantity, setQuantity] = useState<number>(1);
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
  const { navigateBackToSearch } = useSearchNavigation();

  // Calculate best price based on available products
  const calculateSavings = () => {
    console.log("Running calculateSavings with products:", {
      maxiPali: maxiPaliProduct ? {
        name: maxiPaliProduct.name,
        store: maxiPaliProduct.store,
        price: maxiPaliProduct.price
      } : null,
      masxMenos: masxMenosProduct ? {
        name: masxMenosProduct.name,
        store: masxMenosProduct.store,
        price: masxMenosProduct.price
      } : null,
      walmart: walmartProduct ? {
        name: walmartProduct.name,
        store: walmartProduct.store,
        price: walmartProduct.price
      } : null
    });

    if (!maxiPaliProduct && !masxMenosProduct && !walmartProduct) {
      console.log("No products available for price comparison");
      return null;
    }
    
    // Initialize prices, using 0 only if the product doesn't exist (not if price is missing)
    const maxiPaliPrice = maxiPaliProduct?.price || Infinity;
    const masxMenosPrice = masxMenosProduct?.price || Infinity;
    const walmartPrice = walmartProduct?.price || Infinity;
    
    console.log("Price comparison:", {
      MaxiPali: maxiPaliPrice === Infinity ? "not available" : maxiPaliPrice,
      MasxMenos: masxMenosPrice === Infinity ? "not available" : masxMenosPrice,
      Walmart: walmartPrice === Infinity ? "not available" : walmartPrice
    });
    
    // If all prices are missing, return null
    if (maxiPaliPrice === Infinity && masxMenosPrice === Infinity && walmartPrice === Infinity) {
      console.log("No valid prices found for comparison");
      return null;
    }

    let bestPrice = null;
    
    // Compare prices and calculate savings
    if (maxiPaliPrice < masxMenosPrice && maxiPaliPrice < walmartPrice) {
      console.log("MaxiPali has best price:", maxiPaliPrice);
      
      // Calculate savings compared to the next lowest price
      const nextLowestPrice = Math.min(
        masxMenosPrice === Infinity ? Number.MAX_SAFE_INTEGER : masxMenosPrice,
        walmartPrice === Infinity ? Number.MAX_SAFE_INTEGER : walmartPrice
      );
      
      const savingsAmount = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : nextLowestPrice - maxiPaliPrice;
      const savingsPercentage = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : (savingsAmount / nextLowestPrice) * 100;
      
      bestPrice = {
        store: 'MaxiPali' as const,
        price: maxiPaliPrice,
        savings: savingsAmount,
        savingsPercentage
      };
    } else if (masxMenosPrice < maxiPaliPrice && masxMenosPrice < walmartPrice) {
      console.log("MasxMenos has best price:", masxMenosPrice);
      
      // Calculate savings compared to the next lowest price
      const nextLowestPrice = Math.min(
        maxiPaliPrice === Infinity ? Number.MAX_SAFE_INTEGER : maxiPaliPrice,
        walmartPrice === Infinity ? Number.MAX_SAFE_INTEGER : walmartPrice
      );
      
      const savingsAmount = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : nextLowestPrice - masxMenosPrice;
      const savingsPercentage = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : (savingsAmount / nextLowestPrice) * 100;
      
      bestPrice = {
        store: 'MasxMenos' as const,
        price: masxMenosPrice,
        savings: savingsAmount,
        savingsPercentage
      };
    } else if (walmartPrice < maxiPaliPrice && walmartPrice < masxMenosPrice) {
      console.log("Walmart has best price:", walmartPrice);
      
      // Calculate savings compared to the next lowest price
      const nextLowestPrice = Math.min(
        maxiPaliPrice === Infinity ? Number.MAX_SAFE_INTEGER : maxiPaliPrice,
        masxMenosPrice === Infinity ? Number.MAX_SAFE_INTEGER : masxMenosPrice
      );
      
      const savingsAmount = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : nextLowestPrice - walmartPrice;
      const savingsPercentage = nextLowestPrice === Number.MAX_SAFE_INTEGER ? 0 : (savingsAmount / nextLowestPrice) * 100;
      
      bestPrice = {
        store: 'Walmart' as const,
        price: walmartPrice,
        savings: savingsAmount,
        savingsPercentage
      };
    } else {
      // If two or more prices are equal and lowest
      let lowestPrice = Math.min(
        maxiPaliPrice === Infinity ? Number.MAX_SAFE_INTEGER : maxiPaliPrice,
        masxMenosPrice === Infinity ? Number.MAX_SAFE_INTEGER : masxMenosPrice,
        walmartPrice === Infinity ? Number.MAX_SAFE_INTEGER : walmartPrice
      );
      
      if (lowestPrice === Number.MAX_SAFE_INTEGER) {
        console.log("No valid lowest price found");
        return null;
      }
      
      // Give priority to MaxiPali, then MasxMenos, then Walmart
      let store = 'Unknown' as 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Unknown';
      
      if (maxiPaliPrice === lowestPrice) {
        store = 'MaxiPali';
      } else if (masxMenosPrice === lowestPrice) {
        store = 'MasxMenos';
      } else if (walmartPrice === lowestPrice) {
        store = 'Walmart';
      }
      
      console.log(`Multiple stores have the same lowest price (${lowestPrice}), selecting: ${store}`);
      
      bestPrice = {
        store,
        price: lowestPrice,
        savings: 0,
        savingsPercentage: 0
      };
    }
    
    console.log("Selected best price:", bestPrice);
    return bestPrice;
  };
  
  // Get the local bestPrice calculation that will be used throughout the component
  const bestPrice = useMemo(() => calculateSavings(), [maxiPaliProduct, masxMenosProduct, walmartProduct]);
  
  // Synchronize our local bestPrice with the compareResult state when bestPrice changes
  useEffect(() => {
    if (bestPrice) {
      setCompareResult({ bestPrice });
    }
  }, [bestPrice]);

  // For debugging - log bestPrice calculation on initial render
  useEffect(() => {
    // Force recalculation of bestPrice right when component mounts to ensure it's correctly derived
    console.log("Initial bestPrice calculation debug:");
    console.log("Products:", {
      maxiPali: maxiPaliProduct ? {
        name: maxiPaliProduct.name,
        price: maxiPaliProduct.price,
        store: maxiPaliProduct.store
      } : null,
      masxMenos: masxMenosProduct ? {
        name: masxMenosProduct.name,
        price: masxMenosProduct.price,
        store: masxMenosProduct.store
      } : null,
      walmart: walmartProduct ? {
        name: walmartProduct.name,
        price: walmartProduct.price,
        store: walmartProduct.store
      } : null
    });
    
    // Manual calculation to verify the logic
    if (maxiPaliProduct && masxMenosProduct && walmartProduct) {
      const maxiPaliPrice = maxiPaliProduct.price || Infinity;
      const masxMenosPrice = masxMenosProduct.price || Infinity;
      const walmartPrice = walmartProduct.price || Infinity;
      
      console.log("Price comparison:", {
        maxiPali: maxiPaliPrice,
        masxMenos: masxMenosPrice,
        walmart: walmartPrice
      });
      
      // Check which product has the lowest price
      const lowestPrice = Math.min(maxiPaliPrice, masxMenosPrice, walmartPrice);
      const storeWithLowestPrice = 
        lowestPrice === maxiPaliPrice ? 'MaxiPali' :
        lowestPrice === masxMenosPrice ? 'MasxMenos' :
        lowestPrice === walmartPrice ? 'Walmart' : 'Unknown';
      
      console.log("Manual calculation of lowest price:", {
        lowestPrice,
        storeWithLowestPrice
      });
    }
  }, [maxiPaliProduct, masxMenosProduct, walmartProduct]);

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
        
        // IMPORTANT: Log detailed information about each store's products
        console.log("MaxiPali products from API:", result.maxiPaliProducts);
        console.log("MasxMenos products from API:", result.masxMenosProducts);
        console.log("Walmart products from API:", result.walmartProducts);
        console.log("Automercado products from API:", result.automercadoProducts);
        
        // Filter out products with zero price and ensure correct store assignment
        const validMaxiPaliProducts = result.maxiPaliProducts
          .filter(p => p.price > 0)
          .map(p => ({ ...p, store: 'MaxiPali' }));  // Ensure consistent capitalization
        
        const validMasxMenosProducts = result.masxMenosProducts
          .filter(p => p.price > 0)
          .map(p => ({ ...p, store: 'MasxMenos' }));  // Ensure consistent capitalization
        
        const validWalmartProducts = result.walmartProducts
          .filter(p => p.price > 0)
          .map(p => ({ ...p, store: 'Walmart' }));  // Ensure consistent capitalization
        
        const validAutomercadoProducts = result.automercadoProducts
          .filter(p => p.price > 0)
          .map(p => ({ ...p, store: 'Automercado' }));  // Ensure consistent capitalization
        
        console.log(`Valid MaxiPali products count: ${validMaxiPaliProducts.length}`);
        console.log(`Valid MasxMenos products count: ${validMasxMenosProducts.length}`);
        console.log(`Valid Walmart products count: ${validWalmartProducts.length}`);
        console.log(`Valid Automercado products count: ${validAutomercadoProducts.length}`);
        
        // Log the first product from each store if available
        if (validMaxiPaliProducts.length > 0) {
          console.log("First MaxiPali product:", {
            name: validMaxiPaliProducts[0].name,
            price: validMaxiPaliProducts[0].price,
            store: validMaxiPaliProducts[0].store
          });
        } else {
          console.log("No valid MaxiPali products found");
        }
        
        if (validMasxMenosProducts.length > 0) {
          console.log("First MasxMenos product:", {
            name: validMasxMenosProducts[0].name,
            price: validMasxMenosProducts[0].price,
            store: validMasxMenosProducts[0].store
          });
        } else {
          console.log("No valid MasxMenos products found");
        }
        
        if (validWalmartProducts.length > 0) {
          console.log("First Walmart product:", {
            name: validWalmartProducts[0].name,
            price: validWalmartProducts[0].price,
            store: validWalmartProducts[0].store
          });
        } else {
          console.log("No valid Walmart products found");
        }
        
        if (validAutomercadoProducts.length > 0) {
          console.log("First Automercado product:", {
            name: validAutomercadoProducts[0].name,
            price: validAutomercadoProducts[0].price,
            store: validAutomercadoProducts[0].store
          });
        } else {
          console.log("No valid Automercado products found");
        }

        // Main function to find best matches across all store products
        const findBestMatches = async (product: ProductType) => {
          console.log('Finding best matches for product:', product);
          
          // Set similarity threshold
          const similarityThreshold = 45;
          
          try {
            // Get products from all stores
            console.log('Fetching products from all stores for comparison...');
            
            // First determine the original product ID and store to use in the search
            const productName = product.name; // Use product name as the search query
            const originalStore = product.store || 'Unknown'; // Use the product's store as the original store
            const barcode = product.id?.toString(); // Get barcode if available
            
            console.log(`Searching for product: ${productName} from store: ${originalStore}`);
            
            // Call compareProductPrices with the correct parameters
            const result = await compareProductPrices(
              productName,  // productName parameter
              barcode,      // barcode parameter (optional)
              originalStore // originalStore parameter
            );
            
            if (!result) {
              console.error('Failed to fetch products for comparison: null result');
              return { maxipali: null, masxMenos: null, walmart: null };
            }
            
            // Products from the API response already have store properties,
            // but let's ensure they're explicitly set for each product
            const maxiPaliProducts = result.maxiPaliProducts?.map(p => ({
              ...p,
              store: 'MaxiPali' as const
            })) || [];
            
            const masxMenosProducts = result.masxMenosProducts?.map(p => ({
              ...p,
              store: 'MasxMenos' as const
            })) || [];
            
            const walmartProducts = result.walmartProducts?.map(p => ({
              ...p,
              store: 'Walmart' as const
            })) || [];
            
            console.log('Products after store assignment:');
            console.log('MaxiPali products:', maxiPaliProducts.length);
            console.log('MasxMenos products:', masxMenosProducts.length);
            console.log('Walmart products:', walmartProducts.length);
            
            // Find best match for each store
            let bestMaxiPaliMatch = null;
            let bestMasxMenosMatch = null;
            let bestWalmartMatch = null;
            let highestMaxiPaliSimilarity = 0;
            let highestMasxMenosSimilarity = 0;
            let highestWalmartSimilarity = 0;
            
            // Process products from MaxiPali
            for (const p of maxiPaliProducts) {
              const similarity = getProductSimilarity(product, p);
              console.log(`MaxiPali - Product: ${p.name}, Similarity: ${similarity}`);
              
              if (similarity > highestMaxiPaliSimilarity && similarity >= similarityThreshold) {
                highestMaxiPaliSimilarity = similarity;
                bestMaxiPaliMatch = { ...p, store: 'MaxiPali' as const, id: `maxipali-${p.id || Date.now()}` };
              }
            }
            
            // Process products from MasxMenos
            for (const p of masxMenosProducts) {
              const similarity = getProductSimilarity(product, p);
              console.log(`MasxMenos - Product: ${p.name}, Similarity: ${similarity}`);
              
              if (similarity > highestMasxMenosSimilarity && similarity >= similarityThreshold) {
                highestMasxMenosSimilarity = similarity;
                bestMasxMenosMatch = { ...p, store: 'MasxMenos' as const, id: `masxmenos-${p.id || Date.now()}` };
              }
            }
            
            // Process products from Walmart
            for (const p of walmartProducts) {
              const similarity = getProductSimilarity(product, p);
              console.log(`Walmart - Product: ${p.name}, Similarity: ${similarity}`);
              
              if (similarity > highestWalmartSimilarity && similarity >= similarityThreshold) {
                highestWalmartSimilarity = similarity;
                bestWalmartMatch = { ...p, store: 'Walmart' as const, id: `walmart-${p.id || Date.now()}` };
              }
            }
            
            // Add debug logs
            console.log('Best matches found:');
            console.log('MaxiPali:', bestMaxiPaliMatch ? `${bestMaxiPaliMatch.name} (store: ${bestMaxiPaliMatch.store})` : 'None');
            console.log('MasxMenos:', bestMasxMenosMatch ? `${bestMasxMenosMatch.name} (store: ${bestMasxMenosMatch.store})` : 'None');
            console.log('Walmart:', bestWalmartMatch ? `${bestWalmartMatch.name} (store: ${bestWalmartMatch.store})` : 'None');
            
            return {
              maxipali: bestMaxiPaliMatch,
              masxMenos: bestMasxMenosMatch,
              walmart: bestWalmartMatch
            };
          } catch (error) {
            console.error('Error finding best matches:', error);
            return { maxipali: null, masxMenos: null, walmart: null };
          }
        };
        
        // Find the best matches - try to get a product from any store
        const firstAvailableProduct = validMaxiPaliProducts.length > 0 ? validMaxiPaliProducts[0] : 
                                      validMasxMenosProducts.length > 0 ? validMasxMenosProducts[0] : 
                                      validWalmartProducts.length > 0 ? validWalmartProducts[0] :
                                      validAutomercadoProducts.length > 0 ? validAutomercadoProducts[0] : null;
        
        if (!firstAvailableProduct) {
          console.error('No products found in any store!');
          toast({
            title: "No products found",
            description: "Could not find this product in any store.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        const bestMatches = await findBestMatches(firstAvailableProduct);
        
        // Get the best matching products from each store with prefixed IDs to help React distinguish them
        let bestMaxiPaliMatch = bestMatches.maxipali;
        let bestMasxMenosMatch = bestMatches.masxMenos;
        let bestWalmartMatch = bestMatches.walmart;
        
        // Debug logs to check store information
        if (bestMaxiPaliMatch) console.log("Setting MaxiPali product with store:", bestMaxiPaliMatch.store);
        if (bestMasxMenosMatch) console.log("Setting MasxMenos product with store:", bestMasxMenosMatch.store); 
        if (bestWalmartMatch) console.log("Setting Walmart product with store:", bestWalmartMatch.store);
        
        // Force the component to recognize these as new objects by using a small delay to break React batching
        setTimeout(() => {
          // Ensure store property is explicitly set for each product before assigning to state
          if (bestMaxiPaliMatch) {
            bestMaxiPaliMatch.store = 'MaxiPali';
          }
          if (bestMasxMenosMatch) {
            bestMasxMenosMatch.store = 'MasxMenos';
          }
          if (bestWalmartMatch) {
            bestWalmartMatch.store = 'Walmart';
          }

          console.log("Setting products to state with these values:");
          console.log("MaxiPali:", bestMaxiPaliMatch ? `${bestMaxiPaliMatch.name} (store: ${bestMaxiPaliMatch.store})` : 'null');
          console.log("MasxMenos:", bestMasxMenosMatch ? `${bestMasxMenosMatch.name} (store: ${bestMasxMenosMatch.store})` : 'null');
          console.log("Walmart:", bestWalmartMatch ? `${bestWalmartMatch.name} (store: ${bestWalmartMatch.store})` : 'null');
          
          // Assign products to their respective state variables
          if (bestMaxiPaliMatch) {
            console.log("Setting MaxiPali product:", JSON.stringify({
              name: bestMaxiPaliMatch.name,
              store: bestMaxiPaliMatch.store,
              price: bestMaxiPaliMatch.price
            }));
            setMaxiPaliProduct({...bestMaxiPaliMatch, store: 'MaxiPali'});
          } else {
            setMaxiPaliProduct(null);
          }

          if (bestMasxMenosMatch) {
            console.log("Setting MasxMenos product:", JSON.stringify({
              name: bestMasxMenosMatch.name,
              store: bestMasxMenosMatch.store,
              price: bestMasxMenosMatch.price
            }));
            setMasxMenosProduct({...bestMasxMenosMatch, store: 'MasxMenos'});
          } else {
            setMasxMenosProduct(null);
          }

          if (bestWalmartMatch) {
            console.log("Setting Walmart product:", JSON.stringify({
              name: bestWalmartMatch.name,
              store: bestWalmartMatch.store,
              price: bestWalmartMatch.price
            }));
            setWalmartProduct({...bestWalmartMatch, store: 'Walmart'});
          } else {
            setWalmartProduct(null);
          }

          setMatchedProducts([bestMatches]);
        }, 50);
        
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

  // Add debug effect for store cards
  useEffect(() => {
    console.log('Store cards debug info:', {
      maxiPali: {
        product: maxiPaliProduct,
        isLowestPrice: bestPrice?.store === 'MaxiPali',
        store: maxiPaliProduct?.store
      },
      masxMenos: {
        product: masxMenosProduct,
        isLowestPrice: bestPrice?.store === 'MasxMenos',
        store: masxMenosProduct?.store
      },
      walmart: {
        product: walmartProduct,
        isLowestPrice: bestPrice?.store === 'Walmart',
        store: walmartProduct?.store
      },
      bestPrice
    });
  }, [maxiPaliProduct, masxMenosProduct, walmartProduct, bestPrice]);

  // Function to get the product to add based on best price
  const getProductToAdd = (): ProductType | null => {
    // Use our local bestPrice calculation
    if (bestPrice?.store === 'MaxiPali' && maxiPaliProduct) {
      return { ...maxiPaliProduct, store: 'MaxiPali' };
    } else if (bestPrice?.store === 'MasxMenos' && masxMenosProduct) {
      return { ...masxMenosProduct, store: 'MasxMenos' };
    } else if (bestPrice?.store === 'Walmart' && walmartProduct) {
      return { ...walmartProduct, store: 'Walmart' };
    } else {
      // If no best price or the preferred store doesn't have the product,
      // use whatever product is available and preserve its store information
      if (maxiPaliProduct) return { ...maxiPaliProduct, store: 'MaxiPali' };
      if (masxMenosProduct) return { ...masxMenosProduct, store: 'MasxMenos' };
      if (walmartProduct) return { ...walmartProduct, store: 'Walmart' };
      return null;
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

      console.log(`Adding product to list with quantity: ${quantity}`, productToAdd);

      const defaultList = await getOrCreateDefaultList(user.id);
      if (!defaultList) {
        throw new Error(translateUI("No se pudo encontrar o crear una lista de compras predeterminada"));
      }
      
      await addProductToGroceryList(defaultList.id, user.id, productToAdd, quantity);
      
      setIsInList(true);
      toast({
        title: translateUI("Producto agregado"),
        description: translateUI(`${quantity} ${quantity > 1 ? 'unidades agregadas' : 'unidad agregada'} a tu lista de compras`),
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
  const handleAddMatchedProduct = async (product: ProductType, quantity: number = 1) => {
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
      console.log(`Adding matched product with quantity: ${quantity}`, product);

      // Ensure we have the correct store information
      let storeToUse = product.store;
      // If store is missing, try to detect which store section this is based on the UI container
      if (!storeToUse) {
        if (product.id.includes('maxipali')) {
          storeToUse = 'MaxiPali';
        } else if (product.id.includes('masxmenos')) {
          storeToUse = 'MasxMenos';
        } else if (product.id.includes('walmart')) {
          storeToUse = 'Walmart';
        }
      }
      
      // Create a product copy with the store information properly set
      const productWithStore = {
        ...product,
        store: storeToUse
      };
      
      console.log(`Adding product to grocery list with store: ${productWithStore.store}`);
      
      // Get user's default list
      const defaultList = await getOrCreateDefaultList(user.id);
      
      // Add to grocery list with the specified quantity
      const result = await addProductToGroceryList(
        defaultList.id,
        user.id,
        productWithStore,
        quantity
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add product to list');
      }
      
      toast({
        title: "Added to list",
        description: `${quantity > 1 ? `${quantity}x ` : ''}${product.name} has been added to your list from ${productWithStore.store}.`,
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
    
    // Make sure we're showing prices only for the respective stores
    // Each price must be assigned to the correct store
    if (maxiPaliProduct && maxiPaliProduct.price > 0) {
      // Ensure we're using the correct store ID for MaxiPali
    const maxiPaliPrice: Price = {
        storeId: 'maxipali', // Always use the store-specific ID here
        price: maxiPaliProduct.price,
        currency: maxiPaliProduct.currency || 'CRC',
        date: new Date().toISOString()
    };
    console.log("Adding MaxiPali price:", maxiPaliPrice);
    prices.push(maxiPaliPrice);
    }
    
    if (masxMenosProduct && masxMenosProduct.price > 0) {
      // Ensure we're using the correct store ID for MasxMenos
    const masxMenosPrice: Price = {
        storeId: 'masxmenos', // Always use the store-specific ID here
        price: masxMenosProduct.price,
        currency: masxMenosProduct.currency || 'CRC',
        date: new Date().toISOString()
    };
    console.log("Adding MasxMenos price:", masxMenosPrice);
    prices.push(masxMenosPrice);
    }
    
    if (walmartProduct && walmartProduct.price > 0) {
      // Ensure we're using the correct store ID for Walmart
    const walmartPrice: Price = {
        storeId: 'walmart', // Always use the store-specific ID here
        price: walmartProduct.price,
        currency: walmartProduct.currency || 'CRC',
      date: new Date().toISOString()
    };
    console.log("Adding Walmart price:", walmartPrice);
    prices.push(walmartPrice);
    }
    
    // Add additional logging to verify store IDs before returning
    console.log("Final price comparison data (by store):", prices.map(p => `${p.storeId}: ${p.price}`));
    return prices;
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
    : compareResult?.bestPrice?.store === 'MaxiPali' && maxiPaliProduct
    ? maxiPaliProduct
    : compareResult?.bestPrice?.store === 'Walmart' && walmartProduct
    ? walmartProduct
    : (maxiPaliProduct || masxMenosProduct || walmartProduct);

  // Ensure the store property is correctly set for display
  if (mainProduct) {
    if (mainProduct === maxiPaliProduct && mainProduct.store !== 'MaxiPali') {
      mainProduct.store = 'MaxiPali';
    } else if (mainProduct === masxMenosProduct && mainProduct.store !== 'MasxMenos') {
      mainProduct.store = 'MasxMenos';
    } else if (mainProduct === walmartProduct && mainProduct.store !== 'Walmart') {
      mainProduct.store = 'Walmart';
    }
  }

  if (!mainProduct) return null;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            // Use our search-aware navigation
            const hasSearchResults = sessionStorage.getItem('search_results');
            if (hasSearchResults) {
              // If we have search results, navigate back to search page with state preserved
              console.log('Navigating back to search results page');
              navigateBackToSearch();
            } else {
              // Otherwise just go back
              console.log('No saved search results, navigating back in history');
              navigate(-1);
            }
          }}
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
            {/* Price comparison banner - highlight the best price */}
            {bestPrice && (
              <div className={cn(
                "rounded-lg p-4 mb-4 shadow-sm border-l-4",
                bestPrice.store === 'MaxiPali' ? "bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20" : 
                bestPrice.store === 'MasxMenos' ? "bg-green-50 border-green-500 dark:bg-green-900/20" :
                "bg-blue-50 border-blue-500 dark:bg-blue-900/20"
              )}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      bestPrice.store === 'MaxiPali' ? "bg-yellow-100 text-yellow-800" : 
                      bestPrice.store === 'MasxMenos' ? "bg-green-100 text-green-800" :
                      "bg-blue-100 text-blue-800"
                    )}>
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        <TranslatedText 
                          es={`Mejor precio en ${bestPrice.store}`} 
                          en={`Best price at ${bestPrice.store}`} 
                        />
                      </h3>
                      {bestPrice.savings > 0 && (
                        <p className="text-sm">
                          <TranslatedText 
                            es={`Ahorra ${formatCurrency(bestPrice.savings)} (${bestPrice.savingsPercentage.toFixed(0)}%)`} 
                            en={`Save ${formatCurrency(bestPrice.savings)} (${bestPrice.savingsPercentage.toFixed(0)}%)`} 
                          />
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {formatCurrency(bestPrice.price)}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
            </div>
            
                  <div className="pt-4 flex gap-2">
                    <div className="flex items-center border rounded-md mr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-10 px-3"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-2 min-w-[40px] text-center">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-10 px-3"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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
                          <ShoppingCart className="mr-2 h-4 w-4" />
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
                
            {/* Store comparison cards - display side by side for easy comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {/* Important: Each store display must show ONLY products from that store */}
              <div className="store-column maxipali-column">
                <MaxiPaliProductDisplay 
                  product={maxiPaliProduct} 
                  isLowestPrice={bestPrice?.store === 'MaxiPali'}
                />
              </div>
              <div className="store-column masxmenos-column">
                <MasxMenosProductDisplay 
                  product={masxMenosProduct} 
                  isLowestPrice={bestPrice?.store === 'MasxMenos'}
                />
              </div>
              <div className="store-column walmart-column">
                <WalmartProductDisplay 
                  product={walmartProduct} 
                  isLowestPrice={bestPrice?.store === 'Walmart'}
                />
              </div>
            </div>

            {/* Enhanced Tabs for price comparison and alternatives */}
            <Tabs defaultValue="comparison" className="mt-8">
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="comparison">
                  <Scale className="h-4 w-4 mr-2" />
                  <TranslatedText es="Detalles de Precios" en="Price Details" />
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
                {/* Show PriceComparison component if we have prices */}
                {getPriceComparisonData().length > 0 && (
                  <Card>
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

                              {/* Add quantity selector for MaxiPali product */}
                              <div className="flex items-center mt-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const qty = match.maxiPali!.quantity || 1;
                                    if (qty > 1) {
                                      match.maxiPali!.quantity = qty - 1;
                                      setMatchedProducts([...matchedProducts]);
                                    }
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="mx-2 text-sm min-w-[24px] text-center">
                                  {match.maxiPali.quantity || 1}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    match.maxiPali!.quantity = (match.maxiPali!.quantity || 1) + 1;
                                    setMatchedProducts([...matchedProducts]);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleAddMatchedProduct(
                                  match.maxiPali!,
                                  match.maxiPali!.quantity || 1
                                )}
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

                              {/* Add quantity selector for MasxMenos product */}
                              <div className="flex items-center mt-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const qty = match.masxMenos!.quantity || 1;
                                    if (qty > 1) {
                                      match.masxMenos!.quantity = qty - 1;
                                      setMatchedProducts([...matchedProducts]);
                                    }
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="mx-2 text-sm min-w-[24px] text-center">
                                  {match.masxMenos.quantity || 1}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    match.masxMenos!.quantity = (match.masxMenos!.quantity || 1) + 1;
                                    setMatchedProducts([...matchedProducts]);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleAddMatchedProduct(
                                  match.masxMenos!,
                                  match.masxMenos!.quantity || 1
                                )}
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

                              {/* Add quantity selector for Walmart product */}
                              <div className="flex items-center mt-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const qty = match.walmart!.quantity || 1;
                                    if (qty > 1) {
                                      match.walmart!.quantity = qty - 1;
                                      setMatchedProducts([...matchedProducts]);
                                    }
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="mx-2 text-sm min-w-[24px] text-center">
                                  {match.walmart.quantity || 1}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    match.walmart!.quantity = (match.walmart!.quantity || 1) + 1;
                                    setMatchedProducts([...matchedProducts]);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleAddMatchedProduct(
                                  match.walmart!,
                                  match.walmart!.quantity || 1
                                )}
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
