import React, { createContext, useContext, useState, useMemo } from 'react';
import { translateToEnglish, translationState, manualTranslations } from '@/utils/translationUtils';

interface TranslationContextType {
  isTranslated: boolean;
  toggleTranslation: () => void;
  translateText: (text: string | undefined | null) => string;
  translateTitle: (text: string | undefined | null) => string;
  translateDescription: (text: string | undefined | null) => string;
  translateUI: (text: string | undefined | null) => string;
  translateAll: <T>(content: T) => T;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [isTranslated, setIsTranslated] = useState(false);

  const toggleTranslation = () => {
    const newState = !isTranslated;
    setIsTranslated(newState);
    translationState.setTranslated(newState);
  };

  // General translation function for any text
  const translateText = (text: string | undefined | null): string => {
    if (!isTranslated || !text) return text || '';
    
    try {
      return translateToEnglish(text);
    } catch (error) {
      console.error('Translation error:', error);
      return text || '';
    }
  };
  
  // Optimized for titles (product names, category names, etc.)
  const translateTitle = (text: string | undefined | null): string => {
    if (!isTranslated || !text) return text || '';
    
    try {
      // Check for manual translations first
      if (manualTranslations[text]) {
        return manualTranslations[text];
      }
      
      return translateToEnglish(text);
    } catch (error) {
      console.error('Title translation error:', error);
      return text || '';
    }
  };
  
  // Optimized for longer product descriptions
  const translateDescription = (text: string | undefined | null): string => {
    if (!isTranslated || !text) return text || '';
    
    try {
      // Split into sentences for better translation
      const sentences = text.split(/(?<=[.!?])\s+/);
      const translatedSentences = sentences.map(sentence => 
        translateToEnglish(sentence)
      );
      
      return translatedSentences.join(' ');
    } catch (error) {
      console.error('Description translation error:', error);
      return text || '';
    }
  };
  
  // Optimized for UI elements (buttons, labels, etc.)
  const translateUI = (text: string | undefined | null): string => {
    if (!isTranslated || !text) return text || '';
    
    try {
      // UI elements often have exact translations in commonTranslations
      return translateToEnglish(text);
    } catch (error) {
      console.error('UI translation error:', error);
      return text || '';
    }
  };

  // Translate all string properties in an object or array
  const translateAll = useMemo(() => {
    return function translateAllInternal<T>(content: T): T {
      if (!isTranslated || !content) return content;
      
      if (typeof content === 'string') {
        return translateText(content) as unknown as T;
      }
      
      if (Array.isArray(content)) {
        return content.map(item => translateAllInternal(item)) as unknown as T;
      }
      
      if (typeof content === 'object' && content !== null) {
        const result = { ...content as any } as any;
        
        Object.keys(result).forEach(key => {
          result[key] = translateAllInternal(result[key]);
        });
        
        return result as T;
      }
      
      return content;
    };
  }, [isTranslated]);

  return (
    <TranslationContext.Provider value={{ 
      isTranslated, 
      toggleTranslation,
      translateText,
      translateTitle,
      translateDescription,
      translateUI,
      translateAll
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