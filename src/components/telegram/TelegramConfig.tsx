import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { telegramService } from '../../services/telegramService';
import { 
  MessageCircle, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export const TelegramConfig: React.FC = () => {
  const [config, setConfig] = useState({
    botToken: '8365810167:AAG-hEm4AV-vUNWWxVsGl3u901lU--kxU18',
    chatId: '',
    enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [chatUpdates, setChatUpdates] = useState<any[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      await telegramService.initialize();
      const currentConfig = telegramService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load Telegram config:', error);
    }
  };

  const saveConfig = async () => {
    try {
      telegramService.updateConfig(config);
      toast.success('Telegram configuration saved');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await telegramService.testConnection();
      setTestResult(result);
      
      if (result.success) {
        toast.success('Telegram connection successful!');
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test failed');
    } finally {
      setLoading(false);
    }
  };

  const getChatUpdates = async () => {
    setLoading(true);
    try {
      const result = await telegramService.getChatUpdates();
      
      if (result.success && result.updates) {
        setChatUpdates(result.updates);
        if (result.updates.length === 0) {
          toast.info('No messages found. Send a message to your bot first!');
        } else {
          toast.success(`Found ${result.updates.length} updates`);
        }
      } else {
        toast.error(`Failed to get updates: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to get updates:', error);
      toast.error('Failed to get chat updates');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!config.chatId) {
      toast.error('Please set a Chat ID first');
      return;
    }

    setLoading(true);
    try {
      const result = await telegramService.sendMessage({
        text: '🧪 *Test Message*\n\nYour QuickStrap Portal is connected to Telegram! 🚀\n\n✅ Check-in notifications\n✅ Capacity alerts\n✅ Security notifications\n✅ Staff updates',
        parse_mode: 'Markdown'
      });

      if (result.success) {
        toast.success('Test message sent successfully!');
      } else {
        toast.error(`Failed to send message: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      toast.error('Failed to send test message');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const extractChatId = (update: any) => {
    return update.message?.chat?.id || update.edited_message?.chat?.id || null;
  };

  const getStatusBadge = () => {
    if (!config.botToken) return <Badge variant="secondary">Not Configured</Badge>;
    if (!config.chatId) return <Badge variant="outline">Missing Chat ID</Badge>;
    if (!config.enabled) return <Badge variant="secondary">Disabled</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <MessageCircle className="h-6 w-6 mr-2 text-blue-500" />
            Telegram Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure direct Telegram notifications for real-time alerts
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bot Token</label>
            <div className="flex gap-2">
              <Input
                type={showToken ? 'text' : 'password'}
                value={config.botToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setConfig(prev => ({ ...prev, botToken: e.target.value }))
                }
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get this from @BotFather in Telegram
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Chat ID</label>
            <div className="flex gap-2">
              <Input
                value={config.chatId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setConfig(prev => ({ ...prev, chatId: e.target.value }))
                }
                placeholder="123456789 or -123456789 (for groups)"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={getChatUpdates}
                disabled={loading || !config.botToken}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Send a message to your bot, then click refresh to find your Chat ID
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="telegram-enabled"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <label htmlFor="telegram-enabled" className="text-sm font-medium">
              Enable Telegram notifications
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={loading}>
              Save Configuration
            </Button>
            <Button 
              variant="outline" 
              onClick={testConnection} 
              disabled={loading || !config.botToken}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <Button 
              variant="outline" 
              onClick={sendTestMessage} 
              disabled={loading || !config.chatId}
            >
              Send Test Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Updates */}
      {chatUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Chat Messages</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on a Chat ID to use it in your configuration
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chatUpdates.slice(0, 5).map((update, index) => {
                const chatId = extractChatId(update);
                const message = update.message || update.edited_message;
                
                return (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Chat ID: {chatId}</span>
                          <Badge variant="outline">
                            {message?.chat?.type || 'unknown'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {message?.from?.first_name} {message?.from?.last_name}
                          {message?.chat?.title && ` in ${message.chat.title}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          "{message?.text || 'No text'}"
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(chatId.toString())}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig(prev => ({ ...prev, chatId: chatId.toString() }))}
                        >
                          Use This ID
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              Connection Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ Bot connection successful!</p>
                {testResult.botInfo && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p><strong>Bot Name:</strong> {testResult.botInfo.first_name}</p>
                    <p><strong>Username:</strong> @{testResult.botInfo.username}</p>
                    <p><strong>Can Join Groups:</strong> {testResult.botInfo.can_join_groups ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600">❌ Connection failed</p>
                <p className="text-sm text-muted-foreground">{testResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
            Quick Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
              <div>
                <p className="font-medium">Create a Telegram Bot</p>
                <p className="text-muted-foreground">Message @BotFather in Telegram and use /newbot command</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">2</span>
              <div>
                <p className="font-medium">Get Bot Token</p>
                <p className="text-muted-foreground">Copy the token from BotFather (already filled above)</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">3</span>
              <div>
                <p className="font-medium">Start Chat with Bot</p>
                <p className="text-muted-foreground">Send any message to your bot in Telegram</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">4</span>
              <div>
                <p className="font-medium">Get Chat ID</p>
                <p className="text-muted-foreground">Click the refresh button above to find your Chat ID</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">5</span>
              <div>
                <p className="font-medium">Test & Enable</p>
                <p className="text-muted-foreground">Test the connection and enable notifications</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
