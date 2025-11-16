import { useState, useEffect } from "react";
import { Product } from "@/lib/types/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { convertCRCtoUSD, formatCurrency } from "@/utils/currencyUtils";
import { useTranslation } from "@/context/TranslationContext";

interface ProductCardProps {
  product: Product;
  isInList?: boolean;
  onAddToList?: (productId: string) => Promise<void>;
  index?: number;
}

export const ProductCard = ({
  product,
  isInList = false,
  onAddToList,
  index = 0
}: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isInListLocal, setIsInListLocal] = useState(isInList);
  const { toast } = useToast();
  const { translateText, isTranslated } = useTranslation();

  // Update local state when props change
  useEffect(() => {
    setIsInListLocal(isInList);
  }, [isInList]);

  // Safety check - if product is invalid or missing, display an error card
  if (!product || !product.id) {
    console.error('ProductCard received invalid product data:', product);
    return (
      <Card className="overflow-hidden h-full flex flex-col group hover:shadow-md transition-shadow">
        <div className="p-4 space-y-3 flex-1 flex flex-col justify-center items-center">
          <h3 className="font-medium text-lg text-red-500">Invalid Product Data</h3>
          <p className="text-sm text-muted-foreground">This product cannot be displayed.</p>
        </div>
      </Card>
    );
  }

  // Debug function to verify product data
  const verifyProduct = () => {
    const issues = [];
    
    if (!product.name) issues.push('Missing product name');
    if (typeof product.price !== 'number') issues.push(`Invalid price: ${product.price}`);
    if (!product.store) issues.push('Missing store property');
    
    if (issues.length > 0) {
      console.warn(`ProductCard found issues with product ${product.id}:`, issues);

    }
    
    return issues.length === 0;
  };
  
  // Verify product on mount and on changes
  useEffect(() => {
    verifyProduct();
  }, [product]);
  
  // Check localStorage for added products on mount
  useEffect(() => {
    try {
      const addedProducts = JSON.parse(localStorage.getItem('added_products') || '[]');
      if (addedProducts.includes(product.id) && !isInListLocal) {
        setIsInListLocal(true);

      }
    } catch (error) {
      console.warn('Error checking localStorage for added products:', error);
    }
  }, [product.id, isInListLocal]);

  const handleAddToList = async () => {
    if (!onAddToList) return;
    
    // Already in list or already adding, prevent duplicate calls
    if (isInListLocal || isAdding) return;

    setIsAdding(true);
    
    try {
      // Set local state immediately for better UX
      setIsInListLocal(true);
      
      // Call the parent handler
      await onAddToList(product.id);

      // Ensure state persists even after reloads by adding to localStorage
      try {
        // Store this product as added in localStorage for UI persistence
        const addedProducts = JSON.parse(localStorage.getItem('added_products') || '[]');
        if (!addedProducts.includes(product.id)) {
          addedProducts.push(product.id);
          localStorage.setItem('added_products', JSON.stringify(addedProducts));

        }
      } catch (localStorageError) {
        console.warn('Could not update localStorage added_products:', localStorageError);
      }
    } catch (error) {
      console.error(`Error adding product ${product.id} to list:`, error);
      
      // Revert the local state if there was an error
      setIsInListLocal(false);
      
      toast({
        title: isTranslated ? "Error" : translateText("Error"),
        description: isTranslated ? "Failed to add product to list. Please try again." : "No se pudo añadir el producto a la lista. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Price display with translation
  const renderPrice = () => {
    if (!product.price) {
      return <span className="text-muted-foreground italic">
        {isTranslated ? "Price not available" : translateText("Precio no disponible")}
      </span>;
    }

    const usdPrice = convertCRCtoUSD(product.price);
    
    return (
      <div className="flex flex-col">
        <span className="flex items-center font-semibold">
          {formatCurrency(product.price, "CRC")}
          <span className="ml-2 text-sm text-muted-foreground">
            ({formatCurrency(usdPrice, "USD")})
          </span>
        </span>
      </div>
    );
  };

  return (
    <Card className={cn(
      "overflow-hidden h-full flex flex-col group hover:shadow-md transition-shadow",
      "animate-scale-in animate-delay",
      `animate-delay-${Math.min(index, 10) * 100}`
    )}>
      <div className="relative pt-[100%] bg-muted overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute top-0 left-0 w-full h-full object-contain transition-transform group-hover:scale-105 p-2"
            loading="lazy"
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            {isTranslated ? "No image" : translateText("Sin imagen")}
          </div>
        )}
        
        {/* Sale badge would go here if the Product type had an onSale property */}
        
        {product.store && (
          <Badge
            variant="outline"
            className={cn(
              "absolute bottom-2 left-2 text-xs font-normal",
              product.store.toLowerCase().includes("walmart") && "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
              product.store.toLowerCase().includes("maxi") && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300",
              product.store.toLowerCase().includes("masxmenos") && "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300",
              product.store.toLowerCase().includes("auto") && "bg-pink-100 text-pink-800 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300",
              product.store.toLowerCase().includes("price") && "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300",
            )}
          >
            {product.store}
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 flex-1">
          <div>
            <h3 className="font-medium text-lg leading-tight line-clamp-2">{isTranslated ? translateText(product.name) : product.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {product.brand 
                  ? (isTranslated ? translateText(product.brand) : product.brand) 
                  : (isTranslated ? "Unknown brand" : translateText("Marca desconocida"))}
              </p>
              {/* Barcode/EAN would go here if the Product type had that property */}
            </div>
          </div>
          
          {onAddToList && (
            <Button
              size="icon"
              variant={isInListLocal ? "secondary" : "default"}
              className={cn(
                "rounded-full flex-shrink-0",
                isInListLocal && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
              onClick={handleAddToList}
              disabled={isAdding}
              aria-label={isTranslated ? (isInListLocal ? "Added to list" : "Add to list") : translateText(isInListLocal ? "Añadido a la lista" : "Añadir a la lista")}
              data-product-id={product.id}
            >
              {isInListLocal ? (
                <Check className="h-4 w-4" />
              ) : isAdding ? (
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        <div className="mt-auto">
          {renderPrice()}
        </div>
      </div>
    </Card>
  );
};
