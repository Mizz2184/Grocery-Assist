import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  requestPushPermission,
  subscribeToPushNotifications,
  NotificationPreferences,
} from '@/lib/services/notificationService';

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!user?.id) return;

    loadPreferences();
    checkPushPermission();
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const prefs = await getNotificationPreferences(user.id);
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.id || !preferences) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    try {
      const success = await updateNotificationPreferences(user.id, { [key]: value });
      if (success) {
        toast({
          title: 'Preferences updated',
          description: 'Your notification preferences have been saved',
        });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
      // Revert the change
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    if (!user?.id) return;

    try {
      const permission = await requestPushPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        const success = await subscribeToPushNotifications(user.id);
        if (success) {
          toast({
            title: 'Push notifications enabled',
            description: 'You will now receive push notifications',
          });
          await handleToggle('push_notifications', true);
        }
      } else {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Loading notification preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Manage your notification preferences and choose what updates you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences?.email_notifications ?? true}
              onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive browser push notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pushPermission !== 'granted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnablePushNotifications}
                >
                  Enable
                </Button>
              )}
              <Switch
                id="push-notifications"
                checked={preferences?.push_notifications ?? false}
                onCheckedChange={(checked) => handleToggle('push_notifications', checked)}
                disabled={saving || pushPermission !== 'granted'}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4">Notification Types</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="list-shared" className="text-base">
                  List Shared
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone shares a grocery list with you
                </p>
              </div>
              <Switch
                id="list-shared"
                checked={preferences?.list_shared ?? true}
                onCheckedChange={(checked) => handleToggle('list_shared', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="item-added" className="text-base">
                  Item Added
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone adds an item to a shared list
                </p>
              </div>
              <Switch
                id="item-added"
                checked={preferences?.item_added ?? true}
                onCheckedChange={(checked) => handleToggle('item_added', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="item-checked" className="text-base">
                  Item Checked
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone checks off an item in a shared list
                </p>
              </div>
              <Switch
                id="item-checked"
                checked={preferences?.item_checked ?? false}
                onCheckedChange={(checked) => handleToggle('item_checked', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="list-updated" className="text-base">
                  List Updated
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone updates a shared list
                </p>
              </div>
              <Switch
                id="list-updated"
                checked={preferences?.list_updated ?? true}
                onCheckedChange={(checked) => handleToggle('list_updated', checked)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {pushPermission === 'denied' && (
          <div className="bg-muted p-4 rounded-md flex items-start gap-3">
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Push notifications are blocked</p>
              <p className="text-muted-foreground mt-1">
                To enable push notifications, please allow them in your browser settings
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
