// Exchange rate API service
// This provides real-time exchange rates for CRC to other currencies

// The default fallback rate in case API calls fail
const DEFAULT_CRC_TO_USD_RATE = 0.00195; // Approximately 1/511.85

/**
 * Fetches the current CRC to USD exchange rate from jsdelivr API
 * @returns The exchange rate as a number
 */
export async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/crc.json'
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Currency API error:', errorText);
      throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // The API returns an object with crc property containing exchange rates
    if (data && typeof data === 'object' && data.crc && data.crc.usd) {
      const crcToUsd = data.crc.usd;

      return crcToUsd;
    }
    
    // Handle unexpected response format
    console.error('Unexpected API response format:', data);
    return DEFAULT_CRC_TO_USD_RATE;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return DEFAULT_CRC_TO_USD_RATE; // Fallback to default rate
  }
} 