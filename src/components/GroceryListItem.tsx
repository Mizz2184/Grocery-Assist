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
  
  const itemPrice = product.price || 0;
  const totalPrice = itemPrice * item.quantity;
  const totalPriceUSD = convertCRCtoUSD(totalPrice);
  const storeName = product.store || 'Unknown';
  
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
  
  const handleQuantityChange = (value: number) => {
    if (value < 1) return;
    setQuantity(value);
    onUpdateQuantity(item.id, value);
  };
  
  // Calculate and render price in both currencies
  const renderPrice = () => {
    const price = item.productData?.price || 0;
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
          onToggleCheck(item.id, checked as boolean);
        }}
        className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
      
      <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0 relative">
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
        {isEditing ? (
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
          <div 
            className="text-sm font-medium cursor-pointer px-2 min-w-[2.5rem] text-center"
            onClick={() => setIsEditing(true)}
          >
            {item.quantity}×
          </div>
        )}
        
        {renderPrice()}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive rounded-full opacity-50 hover:opacity-100"
          onClick={handleRemove}
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
};
