import { useState } from "react";
import { GroceryListItem as GroceryItem } from "@/utils/productData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface GroceryListItemProps {
  item: GroceryItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
}

export const GroceryListItem = ({
  item,
  onUpdateQuantity,
  onToggleCheck,
  onRemove,
}: GroceryListItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();

  // Use product data from the item if it exists, otherwise use getProductById
  const product = item.productData || { 
    name: 'Unknown Product', 
    brand: 'Unknown brand', 
    imageUrl: '',
    price: 0
  };
  
  // Format currency with Costa Rican colón
  const formatPrice = (price: number) => {
    return `₡${price.toLocaleString('es-CR')}`;
  };
  
  const itemPrice = product.price || 0;
  const totalPrice = itemPrice * item.quantity;
  
  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(item.id);
      toast({
        title: "Item removed",
        description: `${product.name} has been removed from your list.`,
      });
    }, 300);
  };
  
  return (
    <Card 
      className={cn(
        "flex items-center p-3 gap-3 transition-all",
        item.checked && "bg-muted/30 dark:bg-muted/10",
        isRemoving && "scale-95 opacity-50"
      )}
    >
      <Checkbox 
        checked={item.checked}
        onCheckedChange={(checked) => {
          onToggleCheck(item.id, checked as boolean);
        }}
        className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
      
      <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-medium line-clamp-1 transition-all",
          item.checked && "line-through text-muted-foreground"
        )}>
          {product.name}
        </h4>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{product.brand || 'Unknown brand'}</p>
          <div className="text-xs font-medium text-right">
            <span className={item.checked ? "text-muted-foreground" : "text-primary"}>
              {formatPrice(itemPrice)}
            </span>
            {item.quantity > 1 && (
              <span className="text-muted-foreground ml-1">
                × {item.quantity}
              </span>
            )}
          </div>
        </div>
        {item.quantity > 1 && (
          <div className="text-sm font-semibold text-right mt-1">
            <span className={item.checked ? "text-muted-foreground" : ""}>
              {formatPrice(totalPrice)}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={item.quantity <= 1 || item.checked}
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <span className="w-6 text-center font-medium">{item.quantity}</span>
        
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={item.checked}
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
};
