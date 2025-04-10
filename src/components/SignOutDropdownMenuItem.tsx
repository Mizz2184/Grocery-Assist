import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/context/TranslationContext";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

interface SignOutDropdownMenuItemProps {
  onSignOut?: () => void;
  className?: string;
}

export const SignOutDropdownMenuItem = ({ 
  onSignOut,
  className
}: SignOutDropdownMenuItemProps) => {
  const { signOut } = useAuth();
  const { translateText, isTranslated } = useTranslation();
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect iOS and mobile
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    
    const mobileCheck = window.innerWidth < 768;
    setIsMobile(mobileCheck);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <div 
      data-signout-item="true" 
      className={`${isIOS ? "ios-signout-item" : ""} ${className || ""} ${isMobile ? "mt-6" : ""}`}
    >
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        className="text-red-500 cursor-pointer w-full"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        <span className="flex-1 text-center">
          {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
        </span>
      </DropdownMenuItem>
    </div>
  );
}; 