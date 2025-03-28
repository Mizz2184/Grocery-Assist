import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { deleteGroceryListItem } from "@/lib/services/groceryListService";
import { getUserGroceryLists } from "@/lib/services/groceryListService";
import { useAuth } from "@/hooks/useAuth";

export default function GroceryListTest() {
  const [itemId, setItemId] = useState("");
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Load user's lists
  useEffect(() => {
    const loadLists = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Loading lists for user:", user.id);
        const userLists = await getUserGroceryLists(user.id);
        console.log("User lists:", userLists);
        setLists(userLists);
        
        if (userLists.length > 0) {
          setSelectedList(userLists[0]);
        }
      } catch (error) {
        console.error("Error loading lists:", error);
        toast({
          title: "Error",
          description: "Failed to load grocery lists",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadLists();
  }, [user]);
  
  // Delete an item
  const handleDelete = async () => {
    if (!itemId) {
      toast({
        title: "Error",
        description: "Please enter an item ID",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log(`Attempting to delete item: ${itemId}`);
      const result = await deleteGroceryListItem(itemId);
      console.log(`Delete result:`, result);
      
      if (result) {
        toast({
          title: "Success",
          description: `Item ${itemId} deleted successfully`
        });
        
        // Refresh the list
        if (selectedList) {
          const updatedList = {
            ...selectedList,
            items: selectedList.items.filter((item: any) => item.id !== itemId)
          };
          setSelectedList(updatedList);
          
          // Also update in the lists array
          setLists(lists.map(list => 
            list.id === selectedList.id ? updatedList : list
          ));
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete item",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the item",
        variant: "destructive"
      });
    }
  };
  
  // Select an item from the list
  const selectItem = (item: any) => {
    setItemId(item.id);
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <div>Please log in to use this feature</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Grocery List Delete Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delete Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Item ID</label>
                <Input 
                  value={itemId} 
                  onChange={(e) => setItemId(e.target.value)}
                  placeholder="Enter item ID to delete"
                />
              </div>
              
              <Button onClick={handleDelete}>Delete Item</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Items</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedList && selectedList.items && selectedList.items.length > 0 ? (
              <div className="space-y-2">
                {selectedList.items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="p-2 border rounded flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => selectItem(item)}
                  >
                    <div>
                      <div className="font-medium">{item.productData?.name || 'Unknown Product'}</div>
                      <div className="text-sm text-gray-500">ID: {item.id}</div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemId(item.id);
                        handleDelete();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No items in selected list
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {lists.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map(list => (
                <Card 
                  key={list.id} 
                  className={`cursor-pointer ${selectedList?.id === list.id ? 'border-primary' : ''}`}
                  onClick={() => setSelectedList(list)}
                >
                  <CardContent className="p-4">
                    <div className="font-medium">{list.name}</div>
                    <div className="text-sm text-gray-500">{list.items.length} items</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 