
import { Price } from "@/utils/productData";
import { stores } from "@/utils/storeData";
import { cn } from "@/lib/utils";

interface PriceComparisonProps {
  prices: Price[];
  detailed?: boolean;
}

export const PriceComparison = ({ prices, detailed = false }: PriceComparisonProps) => {
  // Sort prices from lowest to highest
  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedPrices[0];
  const highestPrice = sortedPrices[sortedPrices.length - 1];

  // Format number with commas and 2 decimal places
  const formatPrice = (price: number) => {
    return price.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Get store details by id
  const getStore = (storeId: string) => {
    return stores.find(store => store.id === storeId);
  };

  return (
    <div className="space-y-2">
      {detailed ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Price Comparison</h4>
          <div className="space-y-1">
            {sortedPrices.map((price) => {
              const store = getStore(price.storeId);
              const isLowest = price.price === lowestPrice.price;
              const isHighest = price.price === highestPrice.price;
              
              return (
                <div 
                  key={price.storeId}
                  className={cn(
                    "flex justify-between items-center p-2 rounded-lg transition-all",
                    isLowest ? "bg-price-lowest/10 text-price-lowest dark:bg-price-lowest/20" : 
                    isHighest ? "bg-price-highest/10 text-price-highest dark:bg-price-highest/20" : 
                    "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: store?.color }}
                    />
                    <span className="font-medium">{store?.name}</span>
                  </div>
                  <div className="font-mono font-medium">
                    {price.currency}{formatPrice(price.price)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {sortedPrices.map((price) => {
            const store = getStore(price.storeId);
            const isLowest = price.price === lowestPrice.price;
            const isHighest = price.price === highestPrice.price;
            
            return (
              <div 
                key={price.storeId}
                className={cn(
                  "text-xs px-2 py-1 rounded flex items-center gap-1.5 transition-all",
                  isLowest ? "bg-price-lowest/10 text-price-lowest dark:bg-price-lowest/20" : 
                  isHighest ? "bg-price-highest/10 text-price-highest dark:bg-price-highest/20" : 
                  "bg-muted/50"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: store?.color }}
                />
                <span className="font-medium truncate max-w-[5rem]">{store?.name}</span>
                <span className="font-mono">
                  {price.currency}{formatPrice(price.price)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
