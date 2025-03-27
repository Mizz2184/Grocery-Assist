export interface Price {
  storeId: string;
  price: number;
  currency: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  barcode: string;
  category: string;
  prices: Price[];
}

// Function to generate random prices in a realistic range
const generateRandomPrices = (basePrice: number): Price[] => {
  const priceVariance = basePrice * 0.3; // 30% variance
  
  // Create a random MaxiPali price
  const maxiPaliPrice = basePrice + (Math.random() * priceVariance) - (priceVariance / 2);
  
  // Create a MasxMenos price that differs by 5-20%
  const priceDifference = basePrice * (0.05 + Math.random() * 0.15); // 5-20% difference
  const masxMenosPrice = Math.random() > 0.5 
    ? maxiPaliPrice + priceDifference  // Sometimes higher
    : maxiPaliPrice - priceDifference; // Sometimes lower
  
  return [
    {
      storeId: 'maxipali',
      price: maxiPaliPrice,
      currency: '₡',
      date: new Date().toISOString(),
    },
    {
      storeId: 'masxmenos',
      price: masxMenosPrice,
      currency: '₡',
      date: new Date().toISOString(),
    }
  ];
};

// Mock product data
export const products: Product[] = [
  {
    id: '1',
    name: 'Arroz',
    brand: 'Tío Pelón',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e8c7?ixlib=rb-4.0.3',
    barcode: '7411001871046',
    category: 'Grains',
    prices: generateRandomPrices(2500),
  },
  {
    id: '2',
    name: 'Frijoles Negros',
    brand: 'Don Pedro',
    image: 'https://images.unsplash.com/photo-1596097635121-14a800970fb2?ixlib=rb-4.0.3',
    barcode: '7441001871047',
    category: 'Grains',
    prices: generateRandomPrices(1800),
  },
  {
    id: '3',
    name: 'Leche Semidescremada',
    brand: 'Dos Pinos',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?ixlib=rb-4.0.3',
    barcode: '7441001871048',
    category: 'Dairy',
    prices: generateRandomPrices(1200),
  },
  {
    id: '4',
    name: 'Huevos',
    brand: 'Yema Dorada',
    image: 'https://images.unsplash.com/photo-1607690424560-35d967d6b5d5?ixlib=rb-4.0.3',
    barcode: '7441001871049',
    category: 'Dairy',
    prices: generateRandomPrices(2200),
  },
  {
    id: '5',
    name: 'Pan Blanco',
    brand: 'Bimbo',
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?ixlib=rb-4.0.3',
    barcode: '7441001871050',
    category: 'Bakery',
    prices: generateRandomPrices(1500),
  },
  {
    id: '6',
    name: 'Atún en Lata',
    brand: 'Sardimar',
    image: 'https://images.unsplash.com/photo-1597791369375-05ea98111855?ixlib=rb-4.0.3',
    barcode: '7441001871051',
    category: 'Canned',
    prices: generateRandomPrices(1300),
  },
  {
    id: '7',
    name: 'Pasta de Tomate',
    brand: 'Del Monte',
    image: 'https://images.unsplash.com/photo-1560155016-bd4879ae8f21?ixlib=rb-4.0.3',
    barcode: '7441001871052',
    category: 'Canned',
    prices: generateRandomPrices(900),
  },
  {
    id: '8',
    name: 'Aceite de Oliva',
    brand: 'Olivo',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-4.0.3',
    barcode: '7441001871053',
    category: 'Oils',
    prices: generateRandomPrices(3500),
  },
];

// Function to get a product by id
export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

// Function to search products
export const searchProducts = (query: string): Product[] => {
  const lowercaseQuery = query.toLowerCase();
  return products.filter(product => 
    product.name.toLowerCase().includes(lowercaseQuery) || 
    product.brand.toLowerCase().includes(lowercaseQuery) ||
    product.barcode.includes(query)
  );
};

// Export mock grocery list data
export interface GroceryListItem {
  id: string;
  productId: string;
  quantity: number;
  addedBy: string;
  addedAt: string;
  checked: boolean;
  productData?: any;
}

export interface GroceryList {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  items: GroceryListItem[];
  collaborators: string[];
}

export const mockGroceryLists: GroceryList[] = [
  {
    id: 'list1',
    name: 'Weekly Shopping',
    createdBy: 'mock-user-id',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'item1',
        productId: '1',
        quantity: 2,
        addedBy: 'mock-user-id',
        addedAt: new Date().toISOString(),
        checked: false,
      },
      {
        id: 'item2',
        productId: '3',
        quantity: 1,
        addedBy: 'mock-user-id',
        addedAt: new Date().toISOString(),
        checked: true,
      },
    ],
    collaborators: ['collaborator1@example.com'],
  },
];
