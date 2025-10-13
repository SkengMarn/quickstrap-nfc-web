import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input, Badge } from '../ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { webhookService } from '../../services/webhookService';
import { notificationService } from '../../services/notificationService';
import { TelegramConfig } from '../telegram/TelegramConfig';
import { TelegramTest } from '../telegram/TelegramTest';
import { 
  Plus, 
  Trash2, 
  TestTube, 
  Settings, 
  Webhook, 
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookEndpoint {
  name: string;
  url: string;
  status?: 'active' | 'inactive' | 'error';
  lastTest?: Date;
}

interface NotificationConfig {
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatId?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  email?: {
    enabled: boolean;
    recipients?: string[];
  };
}

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({});
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '' });
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('webhooks');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      await Promise.all([
        webhookService.initialize(),
        notificationService.initialize()
      ]);

      const config = webhookService.getConfiguration();
      
      // Convert webhooks map to array
      const webhookArray = Object.entries(config.webhooks).map(([name, url]) => ({
        name,
        url,
        status: 'inactive' as const,
      }));
      
      setWebhooks(webhookArray);
      setNotificationConfig(config.notifications);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      toast.error('Failed to load webhook configuration');
    }
  };

  const addWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast.error('Please provide both name and URL');
      return;
    }

    try {
      webhookService.registerWebhook(newWebhook.name, newWebhook.url);
      setWebhooks(prev => [...prev, { ...newWebhook, status: 'inactive' }]);
      setNewWebhook({ name: '', url: '' });
      toast.success('Webhook added successfully');
    } catch (error) {
      console.error('Failed to add webhook:', error);
      toast.error('Failed to add webhook');
    }
  };

  const removeWebhook = async (name: string) => {
    try {
      webhookService.unregisterWebhook(name);
      setWebhooks(prev => prev.filter(w => w.name !== name));
      toast.success('Webhook removed successfully');
    } catch (error) {
      console.error('Failed to remove webhook:', error);
      toast.error('Failed to remove webhook');
    }
  };

  const testWebhook = async (name: string) => {
    setLoading(true);
    try {
      const result = await webhookService.testWebhook(name);
      setTestResults(prev => ({ ...prev, [name]: result }));
      
      // Update webhook status
      setWebhooks(prev => prev.map(w => 
        w.name === name 
          ? { ...w, status: result.success ? 'active' : 'error', lastTest: new Date() }
          : w
      ));

      if (result.success) {
        toast.success(`Webhook ${name} test successful`);
      } else {
        toast.error(`Webhook ${name} test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setLoading(false);
    }
  };

  const testAllWebhooks = async () => {
    setLoading(true);
    try {
      const promises = webhooks.map(webhook => testWebhook(webhook.name));
      await Promise.all(promises);
      toast.success('All webhooks tested');
    } catch (error) {
      console.error('Failed to test all webhooks:', error);
      toast.error('Failed to test all webhooks');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationConfig = async (updates: Partial<NotificationConfig>) => {
    try {
      await webhookService.updateNotificationConfig(updates);
      setNotificationConfig(prev => ({ ...prev, ...updates }));
      toast.success('Notification configuration updated');
    } catch (error) {
      console.error('Failed to update notification config:', error);
      toast.error('Failed to update notification configuration');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Untested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhook & Notification Management</h2>
          <p className="text-muted-foreground">
            Configure webhooks for n8n automation and notification channels
          </p>
        </div>
        <Button onClick={loadConfiguration} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="telegram">
            <Bell className="h-4 w-4 mr-2" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {/* Add New Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Add New Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Webhook name (e.g., n8n-telegram)"
                  value={newWebhook.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1"
                />
                <Input
                  placeholder="Webhook URL"
                  value={newWebhook.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  className="flex-2"
                />
                <Button onClick={addWebhook} disabled={!newWebhook.name || !newWebhook.url}>
                  Add
                </Button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">n8n Webhook Setup:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Create a new workflow in n8n</li>
                  <li>2. Add a "Webhook" trigger node</li>
                  <li>3. Copy the webhook URL and paste it above</li>
                  <li>4. Configure your automation logic (Telegram, Slack, etc.)</li>
                  <li>5. Activate the workflow</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Webhook List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Webhooks</CardTitle>
                <Button onClick={testAllWebhooks} disabled={loading || webhooks.length === 0} size="sm">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured</p>
                  <p className="text-sm">Add your first webhook to start receiving notifications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(webhook.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{webhook.name}</h4>
                            {getStatusBadge(webhook.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{webhook.url}</p>
                          {webhook.lastTest && (
                            <p className="text-xs text-muted-foreground">
                              Last tested: {webhook.lastTest.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(webhook.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(webhook.name)}
                          disabled={loading}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(webhook.url, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeWebhook(webhook.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(testResults).map(([name, result]) => (
                    <div key={name} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        {result.success ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                      {result.response && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Response: {result.response}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="telegram" className="space-y-4">
          <TelegramTest />
          <TelegramConfig />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Telegram Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Telegram</h4>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationConfig.telegram?.enabled || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                        telegram: { ...notificationConfig.telegram, enabled: e.target.checked }
                      })}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
                {notificationConfig.telegram?.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Bot Token"
                      value={notificationConfig.telegram?.botToken || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                        telegram: { ...notificationConfig.telegram, enabled: notificationConfig.telegram?.enabled || false, botToken: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Chat ID"
                      value={notificationConfig.telegram?.chatId || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                        telegram: { ...notificationConfig.telegram, enabled: notificationConfig.telegram?.enabled || false, chatId: e.target.value }
                      })}
                    />
                  </div>
                )}
              </div>

              {/* Slack Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Slack</h4>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationConfig.slack?.enabled || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                        slack: { ...notificationConfig.slack, enabled: e.target.checked }
                      })}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
                {notificationConfig.slack?.enabled && (
                  <Input
                    placeholder="Slack Webhook URL"
                    value={notificationConfig.slack?.webhookUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                      slack: { ...notificationConfig.slack, enabled: notificationConfig.slack?.enabled || false, webhookUrl: e.target.value }
                    })}
                  />
                )}
              </div>

              {/* Discord Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Discord</h4>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={notificationConfig.discord?.enabled || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                        discord: { ...notificationConfig.discord, enabled: e.target.checked }
                      })}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
                {notificationConfig.discord?.enabled && (
                  <Input
                    placeholder="Discord Webhook URL"
                    value={notificationConfig.discord?.webhookUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotificationConfig({
                      discord: { ...notificationConfig.discord, enabled: notificationConfig.discord?.enabled || false, webhookUrl: e.target.value }
                    })}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Templates are automatically created and managed by the system.
                Use n8n workflows to customize message formatting and routing.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Available Event Types:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• checkin.created</div>
                    <div>• capacity.alert</div>
                    <div>• security.alert</div>
                    <div>• staff.status</div>
                    <div>• gate.approval_request</div>
                    <div>• system.health</div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Template Variables:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• {"{{event_name}}"} - Event name</div>
                    <div>• {"{{wristband_id}}"} - Wristband ID</div>
                    <div>• {"{{gate_name}}"} - Gate name</div>
                    <div>• {"{{staff_name}}"} - Staff member name</div>
                    <div>• {"{{timestamp}}"} - Event timestamp</div>
                    <div>• {"{{current_count}}"} - Current attendance</div>
                    <div>• {"{{capacity_limit}}"} - Capacity limit</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
