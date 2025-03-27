/**
 * Currency utility functions for the application
 */

// Current exchange rate from CRC to USD (approximately 1 USD = 510 CRC)
// In production, this would come from an API
const CRC_TO_USD_RATE = 510;

/**
 * Convert Costa Rican Colón (CRC) to US Dollars (USD)
 * @param amount Amount in CRC
 * @returns Converted amount in USD
 */
export const convertCRCtoUSD = (amount: number): number => {
  return amount / CRC_TO_USD_RATE;
};

/**
 * Format a currency amount according to locale
 * @param amount The amount to format
 * @param currency The currency code (USD, CRC)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'CRC'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  
  // Default to CRC
  return `₡${amount.toLocaleString('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}; 