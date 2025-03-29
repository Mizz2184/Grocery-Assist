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

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { translateText, isTranslated } = useTranslation();

  // Track scroll position to add backdrop when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

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

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-4 transition-all duration-300",
        scrolled ? "glass shadow-sm" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 font-medium text-xl" 
          aria-label="Cost Comrade"
        >
          <div className="relative w-8 h-8">
            <ShoppingCart className="w-7 h-7 absolute" />
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              ₡
            </span>
          </div>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-9 gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {isTranslated ? "My Account" : translateText("Mi Cuenta")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="w-full cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    {isTranslated ? "Profile" : translateText("Perfil")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    {isTranslated ? "Settings" : translateText("Ajustes")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {isTranslated ? "Sign Out" : translateText("Cerrar Sesión")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            onClick={() => setIsMenuOpen(!isMenuOpen)}
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
        <div className="fixed inset-0 z-40 md:hidden glass-card animate-fade-in transition-all">
          <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
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
