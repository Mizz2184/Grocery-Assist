import React, { useState, useEffect } from 'react';
import { fetchCurrentExchangeRate, convertCRCtoUSD, convertUSDtoCRC } from '@/utils/currencyUtils';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/context/TranslationContext';

export const MobileCurrencyConverter: React.FC = () => {
  const [rate, setRate] = useState<number | null>(null);
  const [crcAmount, setCrcAmount] = useState(10000);
  const [usdAmount, setUsdAmount] = useState(0);
  const { isTranslated, translateText } = useTranslation();
  
  useEffect(() => {
    // Load the current exchange rate
    const loadRate = async () => {
      try {
        const fetchedRate = await fetchCurrentExchangeRate();
        setRate(fetchedRate);
        // Update the conversion with the new rate
        setUsdAmount(convertCRCtoUSD(crcAmount));
      } catch (err) {
        console.error('Failed to load exchange rate:', err);
      }
    };
    
    loadRate();
  }, []);
  
  const handleCrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setCrcAmount(value);
    if (rate) {
      setUsdAmount(convertCRCtoUSD(value));
    }
  };

  const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setUsdAmount(value);
    if (rate && rate > 0) {
      setCrcAmount(convertUSDtoCRC(value));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1">
        <label htmlFor="mobile-crc" className="text-xs font-medium">
          {isTranslated ? "Costa Rican Colones (CRC)" : "Colones (CRC)"}
        </label>
        <Input
          id="mobile-crc"
          type="number"
          value={crcAmount}
          onChange={handleCrcChange}
          className="h-8 text-sm"
        />
      </div>
      
      <div className="space-y-1">
        <label htmlFor="mobile-usd" className="text-xs font-medium">
          {isTranslated ? "US Dollars (USD)" : "Dólares (USD)"}
        </label>
        <Input
          id="mobile-usd"
          type="number"
          value={usdAmount.toFixed(2)}
          onChange={handleUsdChange}
          className="h-8 text-sm"
        />
      </div>
      
      {rate && (
        <div className="text-xs text-muted-foreground text-center mt-1">
          1 CRC = {rate.toFixed(6)} USD
        </div>
      )}
    </div>
  );
}; 