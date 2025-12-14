import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Camera, CheckCircle2, XCircle, Barcode } from 'lucide-react';
import { scanReceipt, matchProductsByBarcode, ScannedProduct } from '@/lib/services/receiptScanService';
import { Product } from '@/lib/types/store';
import { addProductToGroceryList } from '@/lib/services/groceryListService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface ReceiptScannerProps {
  listId: string;
  userId: string;
  onProductsAdded: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ listId, userId, onProductsAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResults, setScannedResults] = useState<Array<{
    scannedProduct: ScannedProduct;
    matchedProduct: Product | null;
    selected: boolean;
  }> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      toast({
        title: 'Scanning Receipt',
        description: 'Extracting products and barcodes...',
      });

      const receiptData = await scanReceipt(selectedFile);
      
      if (receiptData.products.length === 0) {
        toast({
          title: 'No Products Found',
          description: 'Could not detect any products in the receipt. Please try a clearer image.',
          variant: 'destructive',
        });
        setIsScanning(false);
        return;
      }

      toast({
        title: 'Matching Products',
        description: `Found ${receiptData.products.length} products. Searching database...`,
      });

      const matchedProducts = await matchProductsByBarcode(receiptData.products, userId);
      
      const matchCount = matchedProducts.filter(r => r.matchedProduct !== null).length;
      
      setScannedResults(
        matchedProducts.map(result => ({
          ...result,
          selected: result.matchedProduct !== null,
        }))
      );

      toast({
        title: 'Receipt Scanned Successfully',
        description: `Matched ${matchCount} of ${receiptData.products.length} products. Review and add to your list.`,
      });
    } catch (error) {
      console.error('Error scanning receipt:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan receipt',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddSelectedProducts = async () => {
    if (!scannedResults) return;

    const selectedProducts = scannedResults.filter(r => r.selected && r.matchedProduct);
    
    if (selectedProducts.length === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product to add',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    console.log(`⚡ Adding ${selectedProducts.length} products in parallel...`);

    // Add all products in parallel for maximum speed
    const addPromises = selectedProducts.map(async (result) => {
      if (result.matchedProduct) {
        try {
          console.log('📤 Adding:', result.matchedProduct.name);

          // Use the matched product data with the scanned quantity
          const productToAdd = {
            ...result.matchedProduct,
            quantity: result.scannedProduct.quantity || 1
          };

          const addResult = await addProductToGroceryList(
            listId,
            userId,
            productToAdd,
            result.scannedProduct.quantity || 1
          );

          return { success: addResult.success, product: result.matchedProduct.name };
        } catch (error) {
          console.error('Error adding product:', error);
          return { success: false, product: result.matchedProduct.name };
        }
      }
      return { success: false, product: 'unknown' };
    });

    // Wait for all products to be added
    const addResults = await Promise.all(addPromises);
    
    const successCount = addResults.filter(r => r.success).length;
    const failCount = addResults.filter(r => !r.success).length;

    setIsAdding(false);

    if (successCount > 0) {
      toast({
        title: 'Products Added',
        description: `Successfully added ${successCount} product${successCount > 1 ? 's' : ''} to your list`,
      });
      onProductsAdded();
      handleClose();
    }

    if (failCount > 0) {
      toast({
        title: 'Some Products Failed',
        description: `${failCount} product${failCount > 1 ? 's' : ''} could not be added`,
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setScannedResults(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const toggleProductSelection = (index: number) => {
    if (!scannedResults) return;
    const updated = [...scannedResults];
    updated[index].selected = !updated[index].selected;
    setScannedResults(updated);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
        <Camera className="h-4 w-4" />
        Scan Receipt
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Scan Receipt</DialogTitle>
            <DialogDescription>
              Upload a photo of your grocery receipt. We'll extract barcodes and automatically match products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!scannedResults ? (
              <>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {previewUrl ? (
                    <div className="relative">
                      <img src={previewUrl} alt="Receipt preview" className="max-h-64 mx-auto rounded" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Choose how to add your receipt:</p>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            onClick={handleCameraClick} 
                            variant="default"
                            className="gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Take Photo
                          </Button>
                          <Button 
                            onClick={handleUploadClick} 
                            variant="outline"
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload File
                          </Button>
                        </div>
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Make sure the receipt text is clear and readable
                      </p>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <Button onClick={handleScan} disabled={isScanning} className="w-full">
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning Receipt...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Scan Receipt
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {scannedResults.filter(r => r.matchedProduct).length} of {scannedResults.length} products matched
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allMatched = scannedResults.filter(r => r.matchedProduct);
                      const allSelected = allMatched.every(r => r.selected);
                      setScannedResults(
                        scannedResults.map(r => ({
                          ...r,
                          selected: r.matchedProduct ? !allSelected : false,
                        }))
                      );
                    }}
                  >
                    {scannedResults.filter(r => r.selected).length === scannedResults.filter(r => r.matchedProduct).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2 pr-4">
                    {scannedResults.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={result.selected}
                            onCheckedChange={() => toggleProductSelection(index)}
                            disabled={!result.matchedProduct}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{result.scannedProduct.name}</p>
                              {result.matchedProduct ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {result.scannedProduct.barcode && (
                                <Badge variant="outline" className="gap-1">
                                  <Barcode className="h-3 w-3" />
                                  {result.scannedProduct.barcode}
                                </Badge>
                              )}
                              {result.scannedProduct.quantity && (
                                <Badge variant="secondary">
                                  Qty: {result.scannedProduct.quantity}
                                </Badge>
                              )}
                              {result.scannedProduct.price && (
                                <Badge variant="secondary">
                                  ₡{result.scannedProduct.price.toLocaleString()}
                                </Badge>
                              )}
                            </div>

                            {result.matchedProduct ? (
                              <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex gap-3">
                                  {result.matchedProduct.imageUrl && (
                                    <img 
                                      src={result.matchedProduct.imageUrl} 
                                      alt={result.matchedProduct.name}
                                      className="w-16 h-16 object-cover rounded"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{result.matchedProduct.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {result.matchedProduct.brand} • {result.matchedProduct.store}
                                    </p>
                                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 mt-1">
                                      {result.matchedProduct.currency} ₡{result.matchedProduct.price.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Quantity from receipt: {result.scannedProduct.quantity || 1}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  ❌ No match found in database
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  This product may not be in your store's catalog yet
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSelectedProducts} 
                    disabled={isAdding || scannedResults.filter(r => r.selected).length === 0} 
                    className="flex-1"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      `Add ${scannedResults.filter(r => r.selected).length} Product${scannedResults.filter(r => r.selected).length !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
