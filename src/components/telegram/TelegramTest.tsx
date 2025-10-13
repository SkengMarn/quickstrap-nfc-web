import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MessageCircle, Send, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export const TelegramTest: React.FC = () => {
  const [botToken] = useState('8365810167:AAG-hEm4AV-vUNWWxVsGl3u901lU--kxU18');
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState('🧪 Test message from QuickStrap Portal!');
  const [loading, setLoading] = useState(false);

  const sendDirectMessage = async () => {
    if (!chatId) {
      toast.error('Please enter a Chat ID');
      return;
    }

    setLoading(true);
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        toast.success('✅ Message sent successfully!');
        console.log('Telegram response:', result);
      } else {
        toast.error(`❌ Failed: ${result.description || 'Unknown error'}`);
        console.error('Telegram error:', result);
      }
    } catch (error) {
      console.error('Network error:', error);
      toast.error('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getChatUpdates = async () => {
    setLoading(true);
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.ok) {
        console.log('Chat updates:', result.result);
        
        if (result.result.length === 0) {
          toast.info('No messages found. Send a message to your bot first!');
        } else {
          const latestUpdate = result.result[result.result.length - 1];
          const chatId = latestUpdate.message?.chat?.id;
          
          if (chatId) {
            setChatId(chatId.toString());
            toast.success(`Found Chat ID: ${chatId}`);
          }
        }
      } else {
        toast.error(`Failed to get updates: ${result.description}`);
      }
    } catch (error) {
      console.error('Error getting updates:', error);
      toast.error('Failed to get chat updates');
    } finally {
      setLoading(false);
    }
  };

  const testBotInfo = async () => {
    setLoading(true);
    try {
      const url = `https://api.telegram.org/bot${botToken}/getMe`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.ok) {
        toast.success(`✅ Bot connected: ${result.result.first_name}`);
        console.log('Bot info:', result.result);
      } else {
        toast.error(`❌ Bot error: ${result.description}`);
      }
    } catch (error) {
      console.error('Bot test error:', error);
      toast.error('❌ Failed to connect to bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-blue-500" />
          Telegram Direct Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Bot Token (Pre-filled)</label>
          <Input value={botToken} disabled className="bg-gray-50" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Chat ID</label>
          <div className="flex gap-2">
            <Input
              value={chatId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatId(e.target.value)}
              placeholder="Your chat ID (e.g., 123456789)"
            />
            <Button variant="outline" onClick={getChatUpdates} disabled={loading}>
              Get ID
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Test Message</label>
          <Input
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
            placeholder="Enter test message"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={testBotInfo} disabled={loading} variant="outline">
            <TestTube className="h-4 w-4 mr-2" />
            Test Bot
          </Button>
          <Button onClick={sendDirectMessage} disabled={loading || !chatId}>
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Quick Setup:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Start a chat with your bot in Telegram</li>
            <li>2. Send any message to your bot</li>
            <li>3. Click "Get ID" to find your Chat ID</li>
            <li>4. Click "Send Message" to test</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
