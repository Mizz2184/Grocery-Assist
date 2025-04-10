import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/context/ThemeContext';
import { Laptop, Moon, Sun, Globe, Languages, LogOut, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLanguageChange = (language: string) => {
    toast({
      title: 'Language Changed',
      description: `Language preference set to ${language}`,
    });
  };

  return (
    <div className="container my-8 max-w-4xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid gap-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Email</span>
              <span className="text-sm text-muted-foreground">
                {user?.email || 'Not signed in'}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Name</span>
              <span className="text-sm text-muted-foreground">
                {user?.user_metadata?.full_name || 'Not specified'}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </CardFooter>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how Cost Comrade looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sun className="h-5 w-5" />
                  <span>Light</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={theme === 'light' ? 'border border-primary' : ''}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="h-5 w-5" />
                  <span>Dark</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={theme === 'dark' ? 'border border-primary' : ''}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Laptop className="h-5 w-5" />
                  <span>System</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={theme === 'system' ? 'border border-primary' : ''}
                  onClick={() => setTheme('system')}
                >
                  <Laptop className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Push notifications</span>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Email updates</span>
              <Switch
                checked={emailUpdates}
                onCheckedChange={setEmailUpdates}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Language & Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium">Preferred Language</span>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="justify-start border-primary"
                    onClick={() => handleLanguageChange('English')}
                  >
                    <Languages className="mr-2 h-4 w-4" />
                    English
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleLanguageChange('Spanish')}
                  >
                    <Languages className="mr-2 h-4 w-4" />
                    Spanish
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <span className="text-sm font-medium">Region</span>
                <div className="mt-2">
                  <Button variant="outline" className="justify-start border-primary w-full">
                    <Globe className="mr-2 h-4 w-4" />
                    Costa Rica
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
