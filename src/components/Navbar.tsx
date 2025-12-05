import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TranslationToggle } from "@/components/TranslationToggle";
import { ExchangeRateDisplay } from "@/components/ExchangeRateDisplay";
import { NotificationBell } from "@/components/NotificationBell";
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
import { useSearchNavigation } from "@/hooks/useSearchNavigation";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { translateText, isTranslated } = useTranslation();
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  // Touch gesture variables
  const touchStartYRef = React.useRef<number | null>(null);
  const { navigatePreservingSearch } = useSearchNavigation();

  // Track scroll position to add backdrop when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Add touch gesture handling for dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    
    const dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null) return;
      
      const touchY = e.touches[0].clientY;
      const diff = touchStartYRef.current - touchY;
      
      // If swiped up by more than 30px, close the dropdown
      if (diff > 30) {
        setIsDropdownOpen(false);
        touchStartYRef.current = null;
      }
    };
    
    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };
    
    dropdown.addEventListener('touchstart', handleTouchStart);
    dropdown.addEventListener('touchmove', handleTouchMove);
    dropdown.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      dropdown.removeEventListener('touchstart', handleTouchStart);
      dropdown.removeEventListener('touchmove', handleTouchMove);
      dropdown.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDropdownOpen]);

  // Handle click outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
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
    setIsDropdownOpen(false);
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
      icon: <span>📅</span>,
      labelES: "Plan de Comidas",
      labelEN: "Meal Plan",
      path: "/meal-plan"
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
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // Handle keyboard navigation
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }
    
    if (isDropdownOpen) {
      const dropdown = document.getElementById('profile-dropdown');
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
          <Button 
            variant="ghost" 
            className="rounded-full h-9" 
            onClick={(e) => {
              e.preventDefault();
              navigatePreservingSearch('/grocery-list');
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isTranslated ? "Grocery List" : translateText("Lista de Compras")}
          </Button>
          <Link to="/meal-plan">
            <Button variant="ghost" className="rounded-full h-9">
              <span className="mr-2">📅</span>
              {isTranslated ? "Meal Plan" : translateText("Plan de Comidas")}
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
            {user && <NotificationBell />}
          </div>
          
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <Button 
                variant="ghost" 
                className="rounded-full h-9 gap-2 cursor-pointer hover:bg-accent active:bg-accent/80"
                onClick={toggleDropdown}
                onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
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
              
              {isDropdownOpen && (
                <div 
                  id="profile-dropdown" 
                  className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden"
                  onKeyDown={handleDropdownKeyDown}
                  role="menu"
                  tabIndex={-1}
                >
                  <div className="mobile-dropdown-content p-2">
                    <div className="flex items-center justify-between pb-2">
                      <div className="px-2 text-sm font-semibold">
                        {isTranslated ? "My Account" : translateText("Mi Cuenta")}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center justify-center rounded-md bg-accent/70 hover:bg-accent"
                        onClick={toggleDropdown}
                        aria-label="Close menu"
                        title="Close menu"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="-mx-1 my-1 h-px bg-muted"></div>
                    <Link 
                      to="/profile" 
                      className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {isTranslated ? "Profile" : translateText("Perfil")}
                    </Link>
                    <Link 
                      to="/settings" 
                      className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsDropdownOpen(false)}
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {isTranslated ? "Settings" : translateText("Ajustes")}
                    </Link>
                    <div className="-mx-1 my-1 h-px bg-muted"></div>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-red-500 w-full text-left"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
                    </button>
                    
                    {/* Swipe indicator */}
                    <div className="mt-3 flex flex-col items-center opacity-60">
                      <div className="h-1 w-10 rounded-full bg-border mb-2"></div>
                      <div className="text-xs text-muted-foreground">
                        {isTranslated ? "Swipe up to close" : translateText("Deslizar hacia arriba para cerrar")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
        <div className="flex md:hidden items-center gap-2">
          <TranslationToggle />
          {user && <NotificationBell />}
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
        <div className="fixed inset-0 w-full h-full bg-background z-40 flex flex-col pt-20 pb-6 px-6 md:hidden">
            {/* Add Close Button for Mobile Menu Overlay */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMenu}
            className="absolute top-4 right-4 p-1 z-50 text-foreground" // Positioned top-right
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="flex flex-col gap-4 mt-4">
            {/* Theme and translation toggles in mobile menu */}
            <div className="flex items-center justify-center gap-2 mb-4">
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
            {navItems.map((item, index) => {
              // Special styling for currency converter item
              if (item.path === '/exchange-rate') {
                return (
                  <div key={item.path}>
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
                  </div>
                );
              }
              
              // Update Grocery List Link in Mobile Menu
              if (item.path === '/grocery-list') {
                return (
                  <Button
                    key={item.path}
                    variant="ghost" // Match styling, but use Button for onClick
                    onClick={(e) => {
                      e.preventDefault();
                      toggleMenu(); // Close menu first
                      navigatePreservingSearch('/grocery-list');
                    }}
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
                  </Button>
                );
              }
              
              // Regular nav items
              return (
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
              );
            })}
            
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
