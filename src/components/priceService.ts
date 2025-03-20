import axios from 'axios';
// Removed conflicting import of Store

export interface Product {
  name: string;
  price: number;
  store: string;
  image: string;
}

export enum Store {
  MAXIPALI = 'MaxiPali',
  // Add other stores here if needed
}

export async function fetchPrices(searchTerm: string): Promise<Product[]> {
  try {
    // MaxiPali API request
    const maxiPaliResponse = await axios.get(
      `https://www.maxipali.co.cr/api/catalog/products/search?term=${searchTerm}`
    );
    
    interface MaxiPaliProduct {
      name: string;
      price: number;
      image?: string;
    }

    const maxiPaliProducts = (maxiPaliResponse.data as MaxiPaliProduct[]).map((item: MaxiPaliProduct) => ({
      name: item.name,
      price: item.price,
      store: Store.MAXIPALI,
      image: item.image || ''
    }));

    return [...maxiPaliProducts];

  } catch (error) {
    console.error('Error fetching prices:', error);
    return [];
  }
}