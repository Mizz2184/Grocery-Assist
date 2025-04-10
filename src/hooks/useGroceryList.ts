import { create } from 'zustand';
import { GroceryList } from '@/utils/productData';

interface GroceryListStore {
  activeList: GroceryList | null;
  setActiveList: (list: GroceryList | null) => void;
}

export const useGroceryList = create<GroceryListStore>((set) => ({
  activeList: null,
  setActiveList: (list) => set({ activeList: list }),
})); 