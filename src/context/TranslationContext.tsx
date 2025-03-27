import React, { createContext, useContext, useState } from 'react';
import { translateToEnglish, translationState } from '@/utils/translationUtils';

interface TranslationContextType {
  isTranslated: boolean;
  toggleTranslation: () => void;
  translateText: (text: string | undefined | null) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [isTranslated, setIsTranslated] = useState(false);

  const toggleTranslation = () => {
    const newState = !isTranslated;
    setIsTranslated(newState);
    translationState.setTranslated(newState);
  };

  const translateText = (text: string | undefined | null): string => {
    if (!isTranslated || !text) return text || '';
    
    try {
      return translateToEnglish(text);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  return (
    <TranslationContext.Provider value={{ 
      isTranslated, 
      toggleTranslation,
      translateText
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
} 