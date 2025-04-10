// Currency conversion rate (1 USD to CRC)
// This can be updated to use a real-time exchange rate API in the future
const USD_TO_CRC_RATE = 517.27; // Example fixed rate

export const convertCRCtoUSD = (crcAmount: number): number => {
  return crcAmount / USD_TO_CRC_RATE;
};

export const formatCRC = (amount: number): string => {
  return `₡${amount.toLocaleString('es-CR')}`;
};

export const formatUSD = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const formatPrice = (amount: number, showBoth: boolean = true): string => {
  if (showBoth) {
    const usdAmount = convertCRCtoUSD(amount);
    return `${formatCRC(amount)} (${formatUSD(usdAmount)})`;
  }
  return formatCRC(amount);
}; 