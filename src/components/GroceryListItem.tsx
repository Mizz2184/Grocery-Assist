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

interface GroceryListItemProps {
  item: GroceryItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
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

// Helper function to get store name from any product structure
const getProductStore = (product: any): string => {
  if (!product) return 'Unknown';
  
  // Direct store property
  if (product.store) {
    // Normalize store names
    const storeName = String(product.store).trim();
    if (storeName.includes('MaxiPali') || storeName.toLowerCase() === 'maxipali') return 'MaxiPali';
    if (storeName.includes('MasxMenos') || storeName.toLowerCase() === 'masxmenos') return 'MasxMenos';
    return storeName;
  }
  
  // If product has prices array (mock product structure)
  if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
    const storeId = String(product.prices[0].storeId).toLowerCase();
    if (storeId === 'maxipali') return 'MaxiPali';
    if (storeId === 'masxmenos') return 'MasxMenos';
  }
  
  return 'Other';
};

export const GroceryListItem = ({
  item,
  onUpdateQuantity,
  onToggleCheck,
  onRemove,
  readOnly,
}: GroceryListItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
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
  
  // Ensure the store badge is correctly displayed
  <Badge 
    variant="outline" 
    className={cn(
      "text-[8px] rounded-sm py-0 h-4 font-normal",
      storeName === 'MaxiPali' 
        ? "text-yellow-600" 
        : storeName === 'MasxMenos' 
          ? "text-green-600" 
          : "text-gray-600"
    )}
  >
    {storeName}
  </Badge>
  
  // Determine store color 
  const getStoreColor = (store: string) => {
    switch(store) {
      case 'MaxiPali':
        return 'bg-yellow-500';
      case 'MasxMenos':
        return 'bg-green-600';
      default:
        return 'bg-gray-500';
    }
  };
  
  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const success = await deleteGroceryListItem(item.id);
      if (success) {
        onRemove(item.id);
        toast({
          title: "Item removed",
          description: `${product.name} has been removed from your list.`,
        });
      } else {
        throw new Error('Failed to delete item');
      }
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
    onUpdateQuantity(item.id, value);
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
      {!readOnly && (
        <Checkbox 
          checked={item.checked}
          onCheckedChange={(checked) => {
            onToggleCheck(item.id, checked as boolean);
          }}
          className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      )}
      
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
            "absolute top-0 left-0 w-4 h-4 flex items-center justify-center text-[8px] text-white font-bold",
            getStoreColor(storeName)
          )}
        >
          {storeName.charAt(0)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className={cn(
            "font-medium line-clamp-1 transition-all",
            item.checked && "line-through text-muted-foreground"
          )}>
            {product.name}
          </h4>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">{product.brand || 'Unknown brand'}</p>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[8px] rounded-sm py-0 h-4 font-normal",
                `text-${storeName === 'MaxiPali' ? 'yellow' : 'green'}-600`
              )}
            >
              {storeName}
            </Badge>
          </div>
        </div>
        {item.quantity > 1 && (
          <div className="text-sm font-semibold text-right mt-1">
            {renderPrice()}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {!readOnly && (
          isEditing ? (
            <div className="flex items-center border rounded-full px-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={() => handleQuantityChange(quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                onBlur={() => {
                  onUpdateQuantity(item.id, quantity);
                  setIsEditing(false);
                }}
                className="w-10 h-6 border-0 p-0 text-center focus-visible:ring-0"
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={() => handleQuantityChange(quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )
        )}
        
        {renderPrice()}
      </div>
    </Card>
  );
};
