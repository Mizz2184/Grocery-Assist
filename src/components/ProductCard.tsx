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
  onAddToList?: (productId: string) => void;
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

  // Debug log to check product data
  console.log('Product in ProductCard:', product);
  console.log('Image URL:', product.imageUrl);

  const handleAddToList = async () => {
    if (!onAddToList) return;
    
    setIsAdding(true);
    try {
      await onAddToList(product.id);
      // Update local state to show check mark immediately
      setIsInListLocal(true);
    } catch (error) {
      console.error('Error adding product to list:', error);
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
        {product.pricePerUnit && (
          <span className="text-xs text-muted-foreground">
            {formatCurrency(product.pricePerUnit, "CRC")}/{translateText(product.unitType || "unidad")}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="block h-full" data-product-id={product.id} data-index={index}>
      <Card className="overflow-hidden h-full flex flex-col group hover:shadow-md transition-shadow">
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={isTranslated ? translateText(product.name) : product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {isTranslated ? "No image" : translateText("Sin imagen")}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge 
              variant={product.store === 'MasxMenos' ? 'default' : 'secondary'} 
              className={cn(
                "font-semibold",
                product.store === 'MasxMenos' && "bg-green-600 hover:bg-green-700",
                product.store === 'MaxiPali' && "bg-yellow-500 hover:bg-yellow-600 text-black"
              )}
            >
              {isTranslated ? translateText(product.store) : product.store}
            </Badge>
          </div>
          
          {/* Source Badge */}
          {product.source && (
            <div className="absolute bottom-2 left-2 bg-primary/80 text-white text-xs px-2 py-1 rounded-md">
              {isTranslated ? translateText(product.source) : product.source}
            </div>
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
                {product.ean && (
                  <span className="text-xs text-muted-foreground">
                    EAN: {product.ean}
                  </span>
                )}
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
                disabled={isAdding || isInListLocal}
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

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              {renderPrice()}
              {product.inStock !== undefined && (
                <Badge variant={product.inStock ? "outline" : "secondary"}>
                  {product.inStock 
                    ? (isTranslated ? "In Stock" : translateText("En existencia")) 
                    : (isTranslated ? "Out of Stock" : translateText("Agotado"))}
                </Badge>
              )}
            </div>
            {product.category && (
              <p className="text-sm text-muted-foreground">{isTranslated ? translateText(product.category) : product.category}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
