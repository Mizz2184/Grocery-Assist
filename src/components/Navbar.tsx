import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Settings, 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const navItems = [
    { icon: <Search className="w-5 h-5" />, label: "Search", path: "/" },
    { icon: <ShoppingCart className="w-5 h-5" />, label: "Lists", path: "/grocery-list" },
    { icon: <User className="w-5 h-5" />, label: "Profile", path: "/profile" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/settings" },
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
          <span className="font-semibold text-lg">Shop-Assist</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" className="rounded-full h-9">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </Link>
          <Link to="/grocery-list">
            <Button variant="ghost" className="rounded-full h-9">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Grocery List
            </Button>
          </Link>
          {user ? (
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-apple",
                isActive("/profile")
                  ? "bg-secondary text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          ) : (
            <Link to="/profile">
              <Button variant="outline" className="rounded-full h-9">
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-full"
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

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden glass-card animate-fade-in transition-all">
          <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
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
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
