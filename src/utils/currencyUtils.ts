/**
 * Currency utility functions for the application
 */

// Current exchange rate for CRC to USD (inverse of ~511.85)
// This value is used as a fallback
export const CRC_TO_USD_RATE = 0.00195;

// Key for storing the exchange rate and last update time in localStorage
const EXCHANGE_RATE_KEY = 'crc_usd_exchange_rate';
const EXCHANGE_RATE_TIMESTAMP_KEY = 'exchange_rate_timestamp';

import { fetchExchangeRate } from '../api/exchange-rate';

/**
 * Fetches the current exchange rate from the jsdelivr API
 * @returns Promise with the current CRC to USD exchange rate
 */
export const fetchCurrentExchangeRate = async (): Promise<number> => {
  try {
    // Fetch the exchange rate from our API helper
    const rate = await fetchExchangeRate();
    
    // Store the rate and timestamp in localStorage
    localStorage.setItem(EXCHANGE_RATE_KEY, rate.toString());
    localStorage.setItem(EXCHANGE_RATE_TIMESTAMP_KEY, Date.now().toString());
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return CRC_TO_USD_RATE; // Fallback to default rate
  }
};

/**
 * Gets the current exchange rate, fetching a new one if needed
 * @returns The current CRC to USD exchange rate
 */
export const getCurrentExchangeRate = (): number => {
  // Check if we have a stored rate and if it's still valid (less than 24 hours old)
  const storedRate = localStorage.getItem(EXCHANGE_RATE_KEY);
  const timestamp = localStorage.getItem(EXCHANGE_RATE_TIMESTAMP_KEY);
  
  if (storedRate && timestamp) {
    const lastUpdate = parseInt(timestamp);
    const now = Date.now();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    // If the rate is less than 24 hours old, use it
    if (hoursSinceUpdate < 24) {
      return parseFloat(storedRate);
    }
  }
  
  // If we don't have a valid stored rate, trigger a fetch but return the default for now
  // This ensures we don't block the UI while fetching
  fetchCurrentExchangeRate().catch(console.error);
  return CRC_TO_USD_RATE;
};

/**
 * Converts USD (US Dollars) to CRC (Costa Rican Colones)
 * @param usdAmount Amount in US Dollars
 * @returns Equivalent amount in Costa Rican Colones
 */
export const convertUSDtoCRC = (usdAmount: number): number => {
  // Use the current exchange rate (inverse of CRC to USD)
  return usdAmount / getCurrentExchangeRate();
};

/**
 * Converts CRC (Costa Rican Colones) to USD (US Dollars)
 * @param crcAmount Amount in Costa Rican Colones
 * @returns Equivalent amount in US Dollars
 */
export const convertCRCtoUSD = (crcAmount: number): number => {
  // Use the current exchange rate
  return crcAmount * getCurrentExchangeRate();
};

/**
 * Formats a currency value with the specified currency symbol
 * @param amount The amount to format
 * @param currency The currency code (e.g., 'USD', 'CRC')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'CRC'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    // Costa Rican Colones don't use decimals in common usage
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}; 