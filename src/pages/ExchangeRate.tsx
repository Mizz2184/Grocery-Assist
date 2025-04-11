import React from 'react';
import { ExchangeRateDisplay } from '@/components/ExchangeRateDisplay';
import { TranslatedText } from '@/App';

const ExchangeRatePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          <TranslatedText es="Conversor de Moneda" en="Currency Converter" />
        </h1>
        
        <p className="mb-8 text-muted-foreground">
          <TranslatedText 
            es="Convierte entre Colones de Costa Rica (CRC) y Dólares Estadounidenses (USD) utilizando tasas de cambio en tiempo real."
            en="Convert between Costa Rican Colones (CRC) and US Dollars (USD) using real-time exchange rates."
          />
        </p>
        
        <div className="mb-4">
          <ExchangeRateDisplay />
        </div>
        
        <div className="mt-12 p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-3">
            <TranslatedText es="Sobre las Tasas de Cambio" en="About Exchange Rates" />
          </h2>
          <p className="text-sm text-muted-foreground">
            <TranslatedText 
              es="Los tipos de cambio se obtienen y se actualizan automáticamente. Si no se puede acceder a la API, se utiliza un tipo de cambio por defecto."
              en="Exchange rates are obtained and updated automatically. If the API cannot be accessed, a default exchange rate is used."
            />
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatePage; 