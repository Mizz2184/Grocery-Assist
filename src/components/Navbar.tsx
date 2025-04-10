import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TranslationToggle } from "@/components/TranslationToggle";
import { ExchangeRateDisplay } from "@/components/ExchangeRateDisplay";
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
import { MobileCurrencyConverter } from "@/components/MobileCurrencyConverter";
import { UserDropdown } from "@/components/UserDropdown";
import { SignOutDropdownMenuItem } from "@/components/SignOutDropdownMenuItem";
import { MobileSignOutButton } from "@/components/MobileSignOutButton";

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
      icon: <span>$</span>,
      labelES: "Conversor",
      labelEN: "Currency",
      path: "/exchange-rate"
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
          aria-label="Shop-Assist"
        >
          <span className="font-semibold text-lg">
            {isTranslated ? "Shop-Assist" : translateText("Asistente de Compras")}
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
          <Link to="/exchange-rate">
            <Button variant="ghost" className="rounded-full h-9">
              <span className="mr-2">$</span>
              {isTranslated ? "Currency" : translateText("Conversor")}
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <TranslationToggle />
            <ThemeToggle />
          </div>
          
          {user ? (
            <UserDropdown />
          ) : (
            <Link to="/login">
              <Button variant="outline" className="rounded-full h-9">
                <User className="w-4 h-4 mr-2" />
                {isTranslated ? "Sign In" : translateText("Iniciar Sesión")}
              </Button>
            </Link>
          )}
        </nav>
        
        {/* Mobile Navigation */}
        <div className="flex items-center md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMenu}
            className="p-1"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 w-full h-full bg-background z-40 flex flex-col pt-20 pb-6 px-6 md:hidden overflow-y-auto">
          <div className="flex flex-col gap-4 mt-4 h-full pb-24">
            {/* Exchange rate in mobile menu */}
            <div className="flex items-center justify-between mb-4">
              <TranslationToggle />
              <ThemeToggle />
            </div>
            
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
            
            {/* Navigation items for mobile */}
            <div className="mobile-dropdown-content overflow-y-auto flex-1">
              {navItems.map((item, index) => {
                // Special styling for currency converter item
                if (item.path === '/exchange-rate') {
                  return (
                    <div key={item.path} className="mb-8">
                      <div className="text-sm text-muted-foreground mt-2 mb-1 px-1">
                        {isTranslated ? "Currency Tools" : translateText("Herramientas de Moneda")}
                      </div>
                      <Link
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
                      
                      {/* Mini currency converter in mobile menu */}
                      <div className="mt-2 rounded-lg bg-accent/50 p-3 animate-fade-up">
                        <div className="mb-1 text-xs font-medium text-muted-foreground text-center">
                          {isTranslated ? 
                            "Quick Currency Converter" : 
                            translateText("Conversor Rápido de Moneda")
                          }
                        </div>
                        <div className="flex justify-center">
                          <div className="w-full max-w-xs">
                            <div className="bg-background rounded-md p-3">
                              <MobileCurrencyConverter />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Regular nav items
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 text-xl px-6 py-3 rounded-full animate-fade-up w-full justify-center mb-3",
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
                );
              })}
              
              {/* Profile link for mobile */}
              <Link
                to="/profile"
                className={cn(
                  "flex items-center gap-3 text-xl px-6 py-3 rounded-full animate-fade-up w-full justify-center mb-3",
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
            </div>
            
            {/* Sign out button for mobile - fixed at bottom */}
            {user && (
              <MobileSignOutButton 
                className="animate-fade-up mt-auto" 
                onSignOut={() => setIsMenuOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </header>
  );
};
