import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ShoppingCart, Tag } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";
import { searchProductByBarcode } from "@/lib/services/barcodeService";
import { Product } from "@/lib/types/store";
import { useToast } from "@/components/ui/use-toast";
import { convertCRCtoUSD, formatCurrency } from "@/utils/currencyUtils";
import { useTranslation } from "@/context/TranslationContext";

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct?: (product: Product) => Promise<void>;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onOpenChange,
  onAddProduct,
}) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [barcode, setBarcode] = useState<string>("");
  const [searchStatus, setSearchStatus] = useState<string>("");
  const { translateText, isTranslated } = useTranslation();

  // Debug product data when it changes
  useEffect(() => {
    if (product) {
      console.log('Product in BarcodeScannerModal:', product);
      console.log('Product price type:', typeof product.price, 'value:', product.price);
    }
  }, [product]);

  const handleBarcodeDetected = async (detectedEan: string) => {
    setIsLoading(true);
    setIsScanning(false);
    setBarcode(detectedEan);
    setSearchStatus("Buscando en MaxiPali y MasxMenos...");

    try {
      console.log('Detected EAN:', detectedEan);
      
      const result = await searchProductByBarcode(detectedEan);
      console.log('API response result:', result);
      
      if (result.success && result.product) {
        // The price should already be properly handled in the service
        const finalProduct = {
          ...result.product
        };
        
        console.log('Final product with price:', finalProduct.price, 'type:', typeof finalProduct.price);
        
        setProduct(finalProduct);
        
        toast({
          title: isTranslated ? "Product Found" : "Producto encontrado",
          description: `${isTranslated ? "Found" : "Encontrado"}: ${finalProduct.name} (${finalProduct.store})`,
        });
      } else {
        toast({
          title: isTranslated ? "Product Not Found" : "Producto no encontrado",
          description: result.message || (isTranslated ? 
            "Could not find product information for this EAN code." : 
            "No se pudo encontrar información del producto para este código EAN."),
          variant: "destructive",
        });
        // Reset to scanning mode
        setIsScanning(true);
      }
    } catch (error) {
      console.error("Error searching product:", error);
      toast({
        title: isTranslated ? "Error" : "Error",
        description: isTranslated ? 
          "Could not search for the product. Please try again." : 
          "No se pudo buscar el producto. Por favor, intente de nuevo.",
        variant: "destructive",
      });
      // Reset to scanning mode
      setIsScanning(true);
    } finally {
      setSearchStatus("");
      setIsLoading(false);
    }
  };

  const handleScanAgain = () => {
    setProduct(null);
    setBarcode("");
    setIsScanning(true);
  };

  const handleAddToList = async () => {
    if (!product || !onAddProduct) return;

    try {
      await onAddProduct(product);
      toast({
        title: "Product Added",
        description: `${product.name} has been added to your list.`,
      });
      onOpenChange(false); // Close modal after adding
    } catch (error) {
      console.error("Error adding product to list:", error);
      toast({
        title: "Error",
        description: "Failed to add product to your list.",
        variant: "destructive",
      });
    }
  };

  // Render price with currency conversion
  const renderPrice = (price: number | undefined) => {
    console.log('Rendering price:', price, 'type:', typeof price);
    
    // Check if price is valid (not undefined, null, 0, or NaN)
    if (price === undefined || price === null || price === 0 || isNaN(price)) {
      return <span className="text-muted-foreground italic">
        {isTranslated ? "Price not available" : translateText("Precio no disponible")}
      </span>;
    }

    const usdPrice = convertCRCtoUSD(price);
    
    return (
      <div className="flex flex-col">
        <span className="font-semibold">
          {formatCurrency(price, "CRC")}
        </span>
        <span className="text-sm text-muted-foreground">
          ({formatCurrency(usdPrice, "USD")})
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isTranslated ? "Scan Product EAN" : translateText("Escanear código EAN")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4">
          {isScanning ? (
            <BarcodeScanner
              onBarcodeDetected={handleBarcodeDetected}
              onClose={() => onOpenChange(false)}
            />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="mt-4 text-center text-lg">
                {searchStatus || (isTranslated ? "Looking up product..." : translateText("Buscando producto..."))}
              </p>
              {barcode && (
                <div className="mt-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-mono">
                    {isTranslated ? "EAN" : translateText("Código EAN")}: {barcode}
                  </span>
                </div>
              )}
            </div>
          ) : product ? (
            <div className="w-full">
              <Card className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">
                      {isTranslated ? translateText(product.store) : product.store}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">
                    {isTranslated ? translateText(product.name) : product.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {product.brand ? (isTranslated ? translateText(product.brand) : product.brand) : 
                    (isTranslated ? "Unknown Brand" : translateText("Marca desconocida"))}
                  </p>
                  <div className="my-2">
                    {isTranslated ? "Price" : translateText("Precio")}: {renderPrice(product.price)}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {product.category && (
                      <span>
                        {isTranslated ? "Category" : translateText("Categoría")}: 
                        {isTranslated ? translateText(product.category) : product.category}
                      </span>
                    )}
                    <span className="font-mono flex items-center gap-1">
                      <Tag className="h-3 w-3" /> 
                      {isTranslated ? "EAN" : translateText("Código EAN")}: {product.ean || product.barcode}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex sm:justify-between">
          {!isScanning && product && (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleScanAgain} className="flex-1">
                {isTranslated ? "Scan Again" : translateText("Escanear de nuevo")}
              </Button>
              <Button 
                onClick={handleAddToList} 
                className="flex-1"
                disabled={!onAddProduct}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isTranslated ? "Add to List" : translateText("Añadir a la lista")}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 