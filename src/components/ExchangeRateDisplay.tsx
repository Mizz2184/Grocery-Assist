import React, { useState, useEffect } from 'react';
import { fetchCurrentExchangeRate, convertCRCtoUSD, formatCurrency } from '@/utils/currencyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export const ExchangeRateDisplay: React.FC = () => {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [crcAmount, setCrcAmount] = useState(10000);
  const [usdAmount, setUsdAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load the exchange rate on component mount
  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedRate = await fetchCurrentExchangeRate();
      setRate(fetchedRate);
      // Update the conversion with the new rate
      setUsdAmount(convertCRCtoUSD(crcAmount));
    } catch (err) {
      setError('Failed to load exchange rate');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      setCrcAmount(value / rate);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Currency Converter</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={loadExchangeRate}
            disabled={loading}
            aria-label="Refresh exchange rate"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        
        {rate !== null && (
          <div className="text-sm text-muted-foreground">
            Current exchange rate: 1 CRC = {rate.toFixed(6)} USD
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="crc-input" className="text-sm font-medium">
            Costa Rican Colones (CRC)
          </label>
          <Input
            id="crc-input"
            type="number"
            value={crcAmount}
            onChange={handleCrcChange}
            placeholder="Enter amount in CRC"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="usd-input" className="text-sm font-medium">
            US Dollars (USD)
          </label>
          <Input
            id="usd-input"
            type="number"
            value={usdAmount.toFixed(2)}
            onChange={handleUsdChange}
            placeholder="Enter amount in USD"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        {rate !== null && (
          <>
            <div>{formatCurrency(crcAmount, 'CRC')}</div>
            <div>≈</div>
            <div>{formatCurrency(usdAmount, 'USD')}</div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}; 