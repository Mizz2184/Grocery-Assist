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
import { ShoppingCart, Plus, MoreVertical, Trash, Edit, CheckSquare, Share, ShoppingBag, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, convertCRCtoUSD } from "@/utils/currencyUtils";
import { useTranslation } from "@/context/TranslationContext";
import { TranslatedText } from "@/App";

export const GroceryList = () => {
  const [lists, setLists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [listToRename, setListToRename] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [listToShare, setListToShare] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState("my-lists");
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translateText, isTranslated } = useTranslation();

  // Fetch grocery lists
  useEffect(() => {
    // Your existing fetch code
  }, [user]);

  // Calculate total price for a specific list
  const calculateTotal = (list: any): number => {
    if (!list || !list.items || !Array.isArray(list.items)) return 0;
    
    return list.items.reduce((listTotal: number, item: any) => {
      return listTotal + (item.price || 0) * item.quantity;
    }, 0);
  };

  // Display total with both currencies
  const renderTotalPrice = (total: number) => {
    const totalUSD = convertCRCtoUSD(total);
    return (
      <div className="flex flex-col">
        <div className="text-xl font-bold flex items-center gap-2">
          {formatCurrency(total, "CRC")}
          <span className="text-sm text-muted-foreground">
            ({formatCurrency(totalUSD, "USD")})
          </span>
        </div>
      </div>
    );
  };

  // Render list item with currency conversion
  const renderListItem = (item: any) => {
    // Calculate the item's total price in both currencies
    const itemTotalPrice = (item.price || 0) * item.quantity;
    const itemTotalPriceUSD = convertCRCtoUSD(itemTotalPrice);
    
    return (
      <div key={item.id} className="flex justify-between items-center p-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border border-gray-300" />
          <div>
            <div className="font-medium">
              {isTranslated ? translateText(item.name) : item.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {item.quantity} × {formatCurrency(item.price || 0, "CRC")}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="font-medium">{formatCurrency(itemTotalPrice, "CRC")}</span>
          <span className="text-xs text-muted-foreground">
            ({formatCurrency(itemTotalPriceUSD, "USD")})
          </span>
        </div>
      </div>
    );
  };

  // Main render function
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <TranslatedText es="Cargando listas de compras..." en="Loading grocery lists..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert>
          <AlertDescription>
            <TranslatedText 
              es="Por favor inicia sesión para ver y gestionar tus listas de compras." 
              en="Please sign in to view and manage your grocery lists." 
            />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <TranslatedText es="Tus Listas de Compras" en="Your Grocery Lists" />
          </h1>
          <Button onClick={() => setIsCreatingList(true)}>
            <Plus className="mr-2 h-4 w-4" /> 
            <TranslatedText es="Crear Lista" en="Create List" />
          </Button>
        </div>
        
        <div className="rounded-lg border bg-card p-8 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            <TranslatedText es="Aún no tienes listas" en="No lists yet" />
          </h3>
          <p className="text-muted-foreground mb-4">
            <TranslatedText es="Crea tu primera lista de compras para empezar a ahorrar." en="Create your first grocery list to start saving." />
          </p>
          <Button onClick={() => setIsCreatingList(true)}>
            <TranslatedText es="Crear una Lista" en="Create a List" />
          </Button>
        </div>
      </div>
    );
  }

  // Example rendering of a list with converted pricing
  const exampleList = lists[0];
  const exampleTotal = calculateTotal(exampleList);
  
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <TranslatedText es="Tus Listas de Compras" en="Your Grocery Lists" />
        </h1>
        <Button onClick={() => setIsCreatingList(true)}>
          <Plus className="mr-2 h-4 w-4" /> 
          <TranslatedText es="Crear Lista" en="Create List" />
        </Button>
      </div>
      
      {/* Example of a single list with currency conversion */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">
            {isTranslated ? translateText(exampleList?.name) : exampleList?.name}
          </h2>
        </div>
        
        <div className="divide-y">
          {exampleList?.items?.map((item: any) => renderListItem(item))}
        </div>
        
        <div className="border-t p-4 bg-muted/30 flex justify-between items-center">
          <span className="font-medium">
            <TranslatedText es="Total" en="Total" />
          </span>
          {renderTotalPrice(exampleTotal)}
        </div>
      </div>
      
      {/* Dialog for creating a new list */}
      <Dialog open={isCreatingList} onOpenChange={setIsCreatingList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <TranslatedText es="Crear Nueva Lista de Compras" en="Create New Grocery List" />
            </DialogTitle>
            <DialogDescription>
              <TranslatedText es="Dale un nombre a tu lista de compras para comenzar." en="Give your grocery list a name to get started." />
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder={isTranslated ? "List name" : "Nombre de la lista"}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingList(false)}>
              <TranslatedText es="Cancelar" en="Cancel" />
            </Button>
            <Button 
              onClick={() => {
                // Your list creation code
                setIsCreatingList(false);
                setNewListName("");
              }}
            >
              <TranslatedText es="Crear Lista" en="Create List" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};