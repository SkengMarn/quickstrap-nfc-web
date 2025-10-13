import React from 'react';
import { TelegramTest } from '../components/telegram/TelegramTest';

const TelegramTestPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Telegram Integration Test</h1>
        <TelegramTest />
      </div>
    </div>
  );
};

export default TelegramTestPage;
