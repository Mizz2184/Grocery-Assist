import React, { useState } from "react";
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

  const handleBarcodeDetected = async (detectedBarcode: string) => {
    setIsLoading(true);
    setIsScanning(false);
    setBarcode(detectedBarcode);
    setSearchStatus("Searching for product information...");

    try {
      setSearchStatus("Checking local database...");
      const result = await searchProductByBarcode(detectedBarcode);
      
      if (result.success && result.product) {
        setProduct(result.product);
        
        let source = "unknown source";
        if (result.product.id.startsWith("openfoodfacts-")) {
          source = "Open Food Facts";
        } else if (result.product.id.startsWith("upcitemdb-")) {
          source = "UPC Database";
        } else if (result.product.id.startsWith("placeholder-")) {
          source = "placeholder";
        } else if (result.product.store === "MaxiPali") {
          source = "MaxiPali";
        }
        
        toast({
          title: "Product Found",
          description: `Found: ${result.product.name} (from ${source})`,
        });
      } else if (result.product) {
        // Placeholder product with warning
        setProduct(result.product);
        toast({
          title: "Product Information Limited",
          description: result.message || "Some product details may need to be filled in manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Product Not Found",
          description: result.message || "Could not find product information for this barcode.",
          variant: "destructive",
        });
        // Reset to scanning mode
        setIsScanning(true);
      }
    } catch (error) {
      console.error("Error searching product:", error);
      toast({
        title: "Error",
        description: "Failed to search for product. Please try again.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Product Barcode</DialogTitle>
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
              <p className="mt-4 text-center text-lg">{searchStatus || "Looking up product..."}</p>
              {barcode && (
                <div className="mt-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-mono">Barcode: {barcode}</span>
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
                      {product.store}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-muted-foreground">{product.brand || "Unknown Brand"}</p>
                  <p className="text-muted-foreground">
                    Price: {product.price > 0 ? `₡${product.price.toLocaleString('es-CR')}` : "Not available"}
                  </p>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {product.category && (
                      <span>Category: {product.category}</span>
                    )}
                    <span className="font-mono flex items-center gap-1">
                      <Tag className="h-3 w-3" /> 
                      {product.barcode}
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
                Scan Again
              </Button>
              <Button 
                onClick={handleAddToList} 
                className="flex-1"
                disabled={!onAddProduct}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to List
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 