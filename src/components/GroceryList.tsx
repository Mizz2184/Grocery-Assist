import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, MoreVertical, Trash, Edit, CheckSquare, Share, ShoppingBag, Check, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, convertCRCtoUSD } from "@/utils/currencyUtils";
import { useTranslation } from "@/context/TranslationContext";
import { TranslatedText } from "@/App";
import { formatPrice } from "@/lib/utils/currency";

interface GroceryListItemType {
  id: string;
  product: {
    name: string;
    price: number;
    store: string;
    imageUrl?: string;
  };
}

const GroceryListItem = ({ item, onRemove }: { item: GroceryListItemType, onRemove: (id: string) => void }) => {
  const { translateTitle, translateText } = useTranslation();
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
          <img 
            src={item.product.imageUrl || 'https://placehold.co/400?text=No+Image'} 
            alt={translateTitle(item.product.name)} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{translateTitle(item.product.name)}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{item.product.store}</span>
            <span>•</span>
            <span>{formatPrice(item.product.price)}</span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const GroceryList = ({ items, onRemoveItem }: { items: GroceryListItemType[], onRemoveItem: (id: string) => void }) => {
  const { translateText } = useTranslation();
  
  const totalPrice = items.reduce((sum, item) => sum + item.product.price, 0);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map(item => (
          <GroceryListItem 
            key={item.id} 
            item={item} 
            onRemove={onRemoveItem}
          />
        ))}
      </div>
      
      {items.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">
              <TranslatedText es="Total" en="Total" />
            </span>
            <span className="font-bold text-lg">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      )}
      
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>
            <TranslatedText 
              es="Tu lista de compras está vacía" 
              en="Your grocery list is empty" 
            />
          </p>
        </div>
      )}
    </div>
  );
};
