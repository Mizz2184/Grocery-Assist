import { useState } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslationToggleProps {
  className?: string;
}

export const TranslationToggle = ({ className }: TranslationToggleProps) => {
  const { isTranslated, toggleTranslation } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    // Small delay to give the feeling of processing happening
    setTimeout(() => {
      toggleTranslation();
      setIsLoading(false);
    }, 300);
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isTranslated ? "default" : "outline"}
      size="icon"
      className={cn(
        "rounded-full relative transition-all duration-300",
        isTranslated && "bg-green-600 hover:bg-green-700",
        className
      )}
      disabled={isLoading}
      title={isTranslated ? "Switch to Spanish" : "Translate to English"}
    >
      <Languages className={cn(
        "h-4 w-4 transition-opacity",
        isLoading && "opacity-0"
      )} />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        </div>
      )}
    </Button>
  );
}; 