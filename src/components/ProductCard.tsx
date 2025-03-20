import { useState } from "react";
import { Product } from "@/lib/types/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ProductCardProps {
  product: Product;
  isInList?: boolean;
  onAddToList?: (productId: string) => void;
}

export const ProductCard = ({
  product,
  isInList = false,
  onAddToList
}: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Debug log to check product data
  console.log('Product in ProductCard:', product);
  console.log('Image URL:', product.imageUrl);

  const handleAddToList = async () => {
    if (!onAddToList) return;
    
    setIsAdding(true);
    try {
      await onAddToList(product.id);
      toast({
        title: "Added to list",
        description: `${product.name} has been added to your grocery list.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="font-normal">
            {product.store}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 flex-1">
          <div>
            <h3 className="font-medium text-lg leading-tight line-clamp-2">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.brand || 'Unknown brand'}</p>
          </div>
          
          {onAddToList && (
            <Button
              size="icon"
              variant={isInList ? "secondary" : "default"}
              className={cn(
                "rounded-full flex-shrink-0",
                isInList && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
              onClick={handleAddToList}
              disabled={isAdding || isInList}
            >
              {isInList ? (
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
            <span className="text-2xl font-semibold">₡{product.price.toLocaleString()}</span>
            {product.inStock !== undefined && (
              <Badge variant={product.inStock ? "outline" : "secondary"}>
                {product.inStock ? "In Stock" : "Out of Stock"}
              </Badge>
            )}
          </div>
          {product.category && (
            <p className="text-sm text-muted-foreground">{product.category}</p>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          {product.sku && (
            <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
          )}
          <Link
            to={`/product/${product.id}`}
            className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
          >
            Details <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
};
