import React from 'react';
import { Button } from '@/components/ui/button';
import { useDropdownWithSignOut } from '@/hooks/useDropdownWithSignOut';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/context/TranslationContext';

export const UserDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { DropdownWithSignOut } = useDropdownWithSignOut();
  const { translateText, isTranslated } = useTranslation();

  const getUserInitials = () => {
    if (!user || !user.user_metadata) return "U";
    
    const name = user.user_metadata.full_name || user.user_metadata.name || "";
    if (!name) return user.email?.charAt(0).toUpperCase() || "U";
    
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Redirect after sign out
  const handleSignOut = () => {
    navigate('/');
  };

  return (
    <DropdownWithSignOut 
      trigger={
        <Button variant="ghost" className="rounded-full h-9 gap-2 cursor-pointer hover:bg-accent active:bg-accent/80">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">
            {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}
          </span>
        </Button>
      }
      onSignOut={handleSignOut}
    >
      <div className="px-2 py-1.5 text-sm font-semibold">
        {isTranslated ? "My Account" : translateText("Mi Cuenta")}
      </div>
      <DropdownMenuItem onClick={() => navigate('/profile')}>
        <User className="w-4 h-4 mr-2" />
        {isTranslated ? "Profile" : translateText("Perfil")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate('/settings')}>
        <Settings className="w-4 h-4 mr-2" />
        {isTranslated ? "Settings" : translateText("Ajustes")}
      </DropdownMenuItem>
    </DropdownWithSignOut>
  );
}; 