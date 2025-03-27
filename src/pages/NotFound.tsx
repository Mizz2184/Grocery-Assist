
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="page-container min-h-[70vh] flex items-center justify-center">
      <div className="max-w-md text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
          <Search className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-semibold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Oops! We couldn't find that page
        </p>
        <Link to="/">
          <Button size="lg" className="rounded-full px-8">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
