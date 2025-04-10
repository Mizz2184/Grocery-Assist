import { supabase } from '@/lib/supabase';
import { CRC_TO_USD_RATE } from '@/utils/currencyUtils';

/**
 * Calculate the total price of all items in a grocery list
 */
export const calculateTotalPrice = (items: any[]) => {
  if (!items || !items.length) {
    return { total: 0, totalInUSD: 0 };
  }

  let total = 0;

  // Calculate total price in Costa Rican Colones (CRC)
  items.forEach(item => {
    const price = item.productData?.price || 0;
    const quantity = item.quantity || 1;
    total += price * quantity;
  });

  // Convert to USD (approximate exchange rate: 1 USD = 510 CRC)
  const totalInUSD = total / CRC_TO_USD_RATE;

  return {
    total,
    totalInUSD: parseFloat(totalInUSD.toFixed(2)),
  };
}; 