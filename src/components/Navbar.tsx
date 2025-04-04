import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TranslationToggle } from "@/components/TranslationToggle";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Settings, 
  Menu, 
  X,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/TranslationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { translateText, isTranslated } = useTranslation();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Track scroll position to add backdrop when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle click outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        document.getElementById('profile-dropdown')?.classList.add('hidden');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle the menu
  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);
    
    // Toggle body class to prevent scrolling when menu is open
    if (newMenuState) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  };
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    document.body.classList.remove('menu-open');
  }, [location.pathname]);
  
  // Cleanup body class on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, []);

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

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { 
      icon: <Search className="w-5 h-5" />, 
      labelES: "Buscar", 
      labelEN: "Search", 
      path: "/" 
    },
    { 
      icon: <ShoppingCart className="w-5 h-5" />, 
      labelES: "Listas", 
      labelEN: "Lists", 
      path: "/grocery-list" 
    },
    { 
      icon: <Settings className="w-5 h-5" />, 
      labelES: "Ajustes", 
      labelEN: "Settings", 
      path: "/settings" 
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown?.classList.toggle('hidden');
    
    // If we just showed the dropdown, focus the first link
    if (!dropdown?.classList.contains('hidden')) {
      const firstLink = dropdown?.querySelector('a, button') as HTMLElement;
      firstLink?.focus();
    }
  };
  
  // Handle keyboard navigation
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    const dropdown = document.getElementById('profile-dropdown');
    
    if (e.key === 'Escape') {
      dropdown?.classList.add('hidden');
      return;
    }
    
    if (!dropdown?.classList.contains('hidden')) {
      const focusableElements = dropdown?.querySelectorAll('a, button') as NodeListOf<HTMLElement>;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const focused = document.activeElement;
        let nextIndex = 0;
        
        focusableElements.forEach((el, i) => {
          if (el === focused && i < focusableElements.length - 1) {
            nextIndex = i + 1;
          }
        });
        
        focusableElements[nextIndex]?.focus();
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const focused = document.activeElement;
        let prevIndex = focusableElements.length - 1;
        
        focusableElements.forEach((el, i) => {
          if (el === focused && i > 0) {
            prevIndex = i - 1;
          }
        });
        
        focusableElements[prevIndex]?.focus();
      }
    }
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-4 transition-all duration-300",
        isMenuOpen ? "nav-transparent" : scrolled ? "glass-nav shadow-sm" : "bg-transparent"
      )}
    >
      <div className="w-full mx-auto flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 font-medium text-xl" 
          aria-label="Cost Comrade"
        >
          <span className="font-semibold text-lg">
            {isTranslated ? "Fam-Assist" : translateText("Asistente de Compras")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" className="rounded-full h-9">
              <Search className="w-4 h-4 mr-2" />
              {isTranslated ? "Search" : translateText("Buscar")}
            </Button>
          </Link>
          <Link to="/grocery-list">
            <Button variant="ghost" className="rounded-full h-9">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {isTranslated ? "Grocery List" : translateText("Lista de Compras")}
            </Button>
          </Link>
          
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <Button 
                variant="ghost" 
                className="rounded-full h-9 gap-2 cursor-pointer hover:bg-accent active:bg-accent/80"
                onClick={toggleDropdown}
                onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={!document.getElementById('profile-dropdown')?.classList.contains('hidden')}
                type="button"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">
                  {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                </span>
              </Button>
              
              <div 
                id="profile-dropdown" 
                className="hidden absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border p-1 z-[999]"
                onKeyDown={handleDropdownKeyDown}
                role="menu"
              >
                <div className="px-2 py-1.5 text-sm font-semibold">
                  {isTranslated ? "My Account" : translateText("Mi Cuenta")}
                </div>
                <div className="-mx-1 my-1 h-px bg-muted"></div>
                <Link 
                  to="/profile" 
                  className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                  onClick={toggleDropdown}
                  role="menuitem"
                >
                  <User className="w-4 h-4 mr-2" />
                  {isTranslated ? "Profile" : translateText("Perfil")}
                </Link>
                <Link 
                  to="/settings" 
                  className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                  onClick={toggleDropdown}
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isTranslated ? "Settings" : translateText("Ajustes")}
                </Link>
                <div className="-mx-1 my-1 h-px bg-muted"></div>
                <button
                  onClick={() => {
                    toggleDropdown();
                    handleSignOut();
                  }}
                  className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer text-red-500 w-full text-left"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="outline" className="rounded-full h-9">
                <User className="w-4 h-4 mr-2" />
                {isTranslated ? "Sign In" : translateText("Iniciar Sesión")}
              </Button>
            </Link>
          )}
          <TranslationToggle />
          <ThemeToggle />
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <TranslationToggle />
          <ThemeToggle />
          <Button
            variant="ghost" 
            size="icon" 
            onClick={toggleMenu}
            className="rounded-full"
            aria-label={isMenuOpen 
              ? (isTranslated ? "Close menu" : translateText("Cerrar menú")) 
              : (isTranslated ? "Open menu" : translateText("Abrir menú"))
            }
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[200] md:hidden mobile-menu-overlay animate-fade-in">
          <div className="absolute top-4 right-4 z-[210]">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="rounded-full bg-background/80 backdrop-blur-sm"
              aria-label={isTranslated ? "Close menu" : translateText("Cerrar menú")}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex flex-col items-center justify-start h-full min-h-screen pt-20 pb-16 gap-6 p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from closing the menu
          >
            {/* User info for mobile */}
            {user && (
              <div className="flex flex-col items-center gap-2 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} />
                  <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-lg font-medium">
                  {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                </span>
              </div>
            )}
            
            {navItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 text-xl px-6 py-3 rounded-full animate-fade-up w-full justify-center",
                  isActive(item.path)
                    ? "bg-secondary text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/80",
                  `animate-delay-${index * 100}`
                )}
              >
                {item.icon}
                <span>
                  {isTranslated ? item.labelEN : translateText(item.labelES)}
                </span>
              </Link>
            ))}
            
            {/* Profile link for mobile */}
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 text-xl px-6 py-3 rounded-full animate-fade-up w-full justify-center",
                isActive("/profile")
                  ? "bg-secondary text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary/80",
                `animate-delay-${navItems.length * 100}`
              )}
            >
              <User className="w-5 h-5" />
              <span>
                {isTranslated ? "Profile" : translateText("Perfil")}
              </span>
            </Link>
            
            {/* Sign out button for mobile */}
            {user && (
              <Button
                variant="destructive"
                className="mt-6 rounded-full w-full animate-fade-up"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5 mr-2" />
                {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
