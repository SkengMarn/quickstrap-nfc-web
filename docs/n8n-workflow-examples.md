# n8n Workflow Examples for QuickStrap Portal

This document provides example n8n workflows that can be used with the QuickStrap Portal webhook system to automate notifications and data processing.

## 🚀 Quick Setup

1. **Install n8n**: `npm install n8n -g`
2. **Start n8n**: `n8n start`
3. **Access n8n**: Open http://localhost:5678
4. **Import workflows**: Copy the JSON configurations below

## 📋 Workflow Examples

### 1. Telegram Notification Workflow

**Purpose**: Send real-time notifications to Telegram when events occur in your portal.

**Setup**:
1. Create a Telegram bot via @BotFather
2. Get your bot token and chat ID
3. Configure the workflow below

```json
{
  "name": "QuickStrap Telegram Notifications",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickstrap-telegram",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "your-webhook-id"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$node.Webhook.json.event}}",
              "operation": "contains",
              "value2": "checkin"
            }
          ]
        }
      },
      "name": "Check-in Events",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 200]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$node.Webhook.json.event}}",
              "operation": "contains",
              "value2": "alert"
            }
          ]
        }
      },
      "name": "Alert Events",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 400]
    },
    {
      "parameters": {
        "chatId": "YOUR_CHAT_ID",
        "text": "={{$node.Webhook.json.data.formatted_message}}",
        "additionalFields": {
          "parse_mode": "HTML"
        }
      },
      "name": "Send Check-in Alert",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [680, 200],
      "credentials": {
        "telegramApi": {
          "id": "1",
          "name": "Telegram Bot"
        }
      }
    },
    {
      "parameters": {
        "chatId": "YOUR_CHAT_ID",
        "text": "🚨 ALERT: {{$node.Webhook.json.data.formatted_message}}",
        "additionalFields": {
          "parse_mode": "HTML"
        }
      },
      "name": "Send Alert",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [680, 400],
      "credentials": {
        "telegramApi": {
          "id": "1",
          "name": "Telegram Bot"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Notification sent successfully"
      },
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [900, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Check-in Events",
            "type": "main",
            "index": 0
          },
          {
            "node": "Alert Events",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check-in Events": {
      "main": [
        [
          {
            "node": "Send Check-in Alert",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Alert Events": {
      "main": [
        [
          {
            "node": "Send Alert",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Check-in Alert": {
      "main": [
        [
          {
            "node": "Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Alert": {
      "main": [
        [
          {
            "node": "Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### 2. Slack Integration Workflow

**Purpose**: Send notifications to Slack channels with rich formatting.

```json
{
  "name": "QuickStrap Slack Notifications",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickstrap-slack"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "channel": "#events",
        "text": "{{$node.Webhook.json.data.formatted_message}}",
        "otherOptions": {
          "username": "QuickStrap Portal"
        },
        "attachments": [
          {
            "color": "good",
            "fields": [
              {
                "title": "Event",
                "value": "{{$node.Webhook.json.data.event_name}}",
                "short": true
              },
              {
                "title": "Time",
                "value": "{{$node.Webhook.json.timestamp}}",
                "short": true
              }
            ]
          }
        ]
      },
      "name": "Send to Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 1,
      "position": [460, 300],
      "credentials": {
        "slackApi": {
          "id": "1",
          "name": "Slack Webhook"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Send to Slack",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### 3. Analytics Data Export Workflow

**Purpose**: Automatically export analytics data to Google Sheets or CSV files.

```json
{
  "name": "QuickStrap Analytics Export",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickstrap-analytics"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$node.Webhook.json.event}}",
              "value2": "analytics.export"
            }
          ]
        }
      },
      "name": "Check Export Event",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "documentId": "YOUR_GOOGLE_SHEET_ID",
        "sheetName": "Event Analytics",
        "options": {
          "useAppend": true
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "Event Name": "={{$node.Webhook.json.data.event_name}}",
            "Date": "={{$node.Webhook.json.data.date}}",
            "Total Check-ins": "={{$node.Webhook.json.data.total_checkins}}",
            "Unique Attendees": "={{$node.Webhook.json.data.unique_attendees}}",
            "Peak Hour": "={{$node.Webhook.json.data.peak_hour}}"
          }
        }
      },
      "name": "Export to Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 2,
      "position": [680, 300],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "1",
          "name": "Google Sheets"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Check Export Event",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Export Event": {
      "main": [
        [
          {
            "node": "Export to Google Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### 4. Email Alert Workflow

**Purpose**: Send email notifications for critical events.

```json
{
  "name": "QuickStrap Email Alerts",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickstrap-email"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$node.Webhook.json.data.priority}}",
              "value2": "critical"
            }
          ]
        }
      },
      "name": "Critical Events Only",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "fromEmail": "alerts@yourcompany.com",
        "toEmail": "admin@yourcompany.com",
        "subject": "🚨 Critical Alert: {{$node.Webhook.json.data.event_name}}",
        "text": "{{$node.Webhook.json.data.formatted_message}}\n\nEvent: {{$node.Webhook.json.data.event_name}}\nTime: {{$node.Webhook.json.timestamp}}\nPriority: {{$node.Webhook.json.data.priority}}"
      },
      "name": "Send Email Alert",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 1,
      "position": [680, 300],
      "credentials": {
        "smtp": {
          "id": "1",
          "name": "SMTP Account"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Critical Events Only",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Critical Events Only": {
      "main": [
        [
          {
            "node": "Send Email Alert",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## 🔧 Configuration Steps

### 1. Set Up Webhook URLs

1. Create your n8n workflows using the examples above
2. Copy the webhook URLs from n8n (they look like: `http://localhost:5678/webhook/your-webhook-id`)
3. Add these URLs in the QuickStrap Portal webhook management interface

### 2. Configure Credentials

**Telegram**:
- Create bot via @BotFather
- Get bot token and chat ID
- Add credentials in n8n

**Slack**:
- Create Slack app and webhook URL
- Add webhook URL in n8n credentials

**Google Sheets**:
- Enable Google Sheets API
- Create OAuth2 credentials
- Configure in n8n

**Email**:
- Configure SMTP settings
- Add email credentials in n8n

### 3. Test Your Workflows

1. Use the "Test Webhook" feature in the Portal
2. Check n8n execution logs
3. Verify notifications are received

## 📊 Available Event Types

The Portal sends these event types that you can filter on:

- `checkin.created` - New check-in events
- `capacity.alert` - Capacity threshold alerts
- `security.alert` - Security-related alerts
- `staff.status` - Staff status changes
- `gate.approval_request` - Gate approval requests
- `system.health` - System health alerts

## 🎯 Advanced Use Cases

### Multi-Channel Routing
Route different event types to different channels:
- Check-ins → Telegram
- Alerts → Slack + Email
- Analytics → Google Sheets

### Conditional Logic
Add conditions based on:
- Event priority
- Event type
- Time of day
- Specific event names

### Data Processing
Transform webhook data:
- Format timestamps
- Calculate metrics
- Aggregate data
- Generate reports

## 🔍 Troubleshooting

**Webhook not receiving data**:
- Check webhook URL is correct
- Verify n8n is running
- Test webhook manually

**Notifications not sending**:
- Check credentials are configured
- Verify channel/chat IDs
- Check n8n execution logs

**Data format issues**:
- Use n8n's data transformation nodes
- Check webhook payload structure
- Add error handling nodes

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Slack API](https://api.slack.com/)
- [Google Sheets API](https://developers.google.com/sheets/api)

## 🚀 Production Deployment

For production use:
1. Deploy n8n to a server (not localhost)
2. Use HTTPS URLs for webhooks
3. Set up proper authentication
4. Configure error handling and retries
5. Monitor workflow executions
