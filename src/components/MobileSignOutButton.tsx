import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';

interface MobileSignOutButtonProps {
  className?: string;
  onSignOut?: () => void;
}

export const MobileSignOutButton = ({ 
  className, 
  onSignOut 
}: MobileSignOutButtonProps) => {
  const { signOut } = useAuth();
  const { translateText, isTranslated } = useTranslation();
  
  const handleSignOut = async () => {
    await signOut();
    if (onSignOut) {
      onSignOut();
    }
  };
  
  return (
    <Button
      variant="destructive"
      className={`mt-auto w-full sticky bottom-6 ${className || ''}`}
      onClick={handleSignOut}
    >
      <LogOut className="w-5 h-5 mr-2" />
      {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
    </Button>
  );
}; 