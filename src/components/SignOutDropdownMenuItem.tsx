import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/context/TranslationContext";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface SignOutDropdownMenuItemProps {
  onSignOut?: () => void;
}

export const SignOutDropdownMenuItem = ({ onSignOut }: SignOutDropdownMenuItemProps) => {
  const { signOut } = useAuth();
  const { translateText, isTranslated } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <div data-signout-item="true">
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        className="text-red-500 cursor-pointer"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
      </DropdownMenuItem>
    </div>
  );
}; 