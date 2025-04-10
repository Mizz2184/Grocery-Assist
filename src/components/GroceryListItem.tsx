import { useState } from "react";
import { GroceryListItem as GroceryItem } from "@/utils/productData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus, Trash2, Check, Trash, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { convertCRCtoUSD } from "@/utils/currencyUtils";
import { deleteGroceryListItem } from "@/lib/services/groceryListService";
import { Product as StoreProduct } from "@/lib/types/store";
import { getProductStore, storeColors as storeColorMap } from "@/utils/storeUtils";

interface GroceryListItemProps {
  item: GroceryItem;
  onUpdateQuantity: (quantity: number) => void | Promise<void>;
  onCheckItem: (checked: boolean) => void | Promise<void>;
  onDeleteItem: () => void | Promise<void>;
  editMode?: boolean;
  storeColor?: string;
}

// Helper function to get image URL from any product structure
const getProductImage = (product: any): string => {
  if (!product) return '';
  
  // Check different possible image properties
  if (product.imageUrl) return product.imageUrl;
  if (product.image) return product.image;
  
  // If product has prices (mock product structure)
  if (product.prices && Array.isArray(product.prices)) {
    return product.image || '';
  }
  
  return '';
};

// Helper function to get price from any product structure
const getProductPrice = (product: any): number => {
  if (!product) return 0;
  
  // Direct price property
  if (typeof product.price === 'number') return product.price;
  
  // If product has prices array (mock product structure)
  if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
    return product.prices[0].price || 0;
  }
  
  return 0;
};

// Use imported getProductStore from utils

export const GroceryListItem = ({
  item,
  onUpdateQuantity,
  onCheckItem,
  onDeleteItem,
  editMode = false,
  storeColor,
}: GroceryListItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const { toast } = useToast();

  // Use product data from the item if it exists
  const product = item.productData || { 
    name: 'Unknown Product', 
    brand: 'Unknown brand', 
    imageUrl: '',
    price: 0
  };
  
  // Format currency with Costa Rican colón
  const formatPrice = (price: number) => {
    return price.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };
  
  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Use helper functions to get price and store name
  const itemPrice = getProductPrice(product);
  const totalPrice = itemPrice * item.quantity;
  const totalPriceUSD = convertCRCtoUSD(totalPrice);
  const storeName = getProductStore(product);
  
  // Determine store color 
  const getStoreColor = (store: string) => {
    const normalizedStore = store.trim();
    
    // Use the storeColorMap from our utils
    const colorClass = storeColorMap[normalizedStore];
    if (colorClass) {
      return colorClass.split(' ')[0]; // Just get the background color class
    }
    
    // Default for unknown stores
    return 'bg-gray-500';
  };
  
  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onDeleteItem();
      toast({
        title: "Item removed",
        description: `${product.name} has been removed from the list.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };
  
  const handleQuantityChange = (value: number) => {
    if (value < 1) return;
    setQuantity(value);
    onUpdateQuantity(value);
  };
  
  // Calculate and render price in both currencies
  const renderPrice = () => {
    const price = getProductPrice(item.productData) || 0;
    const totalPrice = price * item.quantity;
    const totalPriceUSD = convertCRCtoUSD(totalPrice);
    
    return (
      <div className="flex flex-col items-end">
        <div className="font-medium">₡{formatPrice(totalPrice)}</div>
        <div className="text-xs text-muted-foreground">
          {formatUSD(totalPriceUSD)}
        </div>
      </div>
    );
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
          onCheckItem(checked as boolean);
        }}
        className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
      
      <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0 relative">
        {getProductImage(product) ? (
          <img 
            src={getProductImage(product)} 
            alt={product.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {/* Store Badge */}
        <div 
          className={cn(
            "absolute top-0 left-0 w-4 h-4 flex items-center justify-center text-[8px] font-bold",
            storeColor ? 
              `${storeColor.split(' ')[0]} ${storeColor.split(' ')[1]}` : 
              `${getStoreColor(storeName)} text-white`
          )}
        >
          {storeName === 'Walmart' ? 'W' : 
           storeName === 'MaxiPali' ? 'MP' : 
           storeName === 'MasxMenos' ? 'MxM' :
           storeName === 'PriceSmart' ? 'PS' :
           storeName === 'Automercado' ? 'AM' :
           'O'}
        </div>
        {item.quantity > 1 && (
          <Badge variant="outline" className="absolute bottom-0 right-0 bg-background">
            {item.quantity}
          </Badge>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <h3 
            className={cn(
              "font-medium text-sm truncate", 
              item.checked && "line-through text-muted-foreground opacity-60"
            )}
          >
            {product.name}
          </h3>
          <p className={cn(
            "text-xs text-muted-foreground truncate",
            item.checked && "opacity-60"
          )}>
            {product.brand}
          </p>
        </div>
      </div>
      
      {renderPrice()}
      
      <div className="flex items-center gap-2">
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50 p-0 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <span className="text-sm font-medium">{quantity}</span>
          </Button>
          
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-in-out flex items-center gap-1 bg-background border rounded-full shadow-sm px-1 -translate-x-1/2 z-10 pointer-events-none group-hover:pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(Math.max(1, quantity - 1));
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>

            <span className="w-6 text-center text-sm font-medium">{quantity}</span>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(quantity + 1);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Always show delete button, not just in edit mode */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}
          disabled={isRemoving}
          title="Remove item"
          aria-label="Remove item from list"
        >
          {isRemoving ? <Trash className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
};
