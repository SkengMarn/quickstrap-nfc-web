import React from 'react';
import { WebhookManager } from '../components/webhooks/WebhookManager';

const WebhooksPage: React.FC = () => {
  return (
    <div className="p-6">
      <WebhookManager />
    </div>
  );
};

export default WebhooksPage;
