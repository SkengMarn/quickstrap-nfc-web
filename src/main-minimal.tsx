import React from 'react'
import { createRoot } from 'react-dom/client'

console.log('Starting minimal app...');

const MinimalApp = () => {
  console.log('MinimalApp rendering...');
  
  // Test environment variables
  const viteUrl = import.meta.env.VITE_SUPABASE_URL;
  const viteKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const reactUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
  const reactKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;
  
  console.log('Environment variables:', {
    VITE_SUPABASE_URL: viteUrl ? 'DEFINED' : 'UNDEFINED',
    VITE_SUPABASE_ANON_KEY: viteKey ? 'DEFINED' : 'UNDEFINED',
    VITE_REACT_APP_SUPABASE_URL: reactUrl ? 'DEFINED' : 'UNDEFINED',
    VITE_REACT_APP_SUPABASE_ANON_KEY: reactKey ? 'DEFINED' : 'UNDEFINED'
  });
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Minimal Test App</h1>
      <p>✅ React is working!</p>
      <h2>Environment Variables:</h2>
      <ul>
        <li><strong>VITE_SUPABASE_URL:</strong> {viteUrl ? 'DEFINED' : 'UNDEFINED'}</li>
        <li><strong>VITE_SUPABASE_ANON_KEY:</strong> {viteKey ? 'DEFINED' : 'UNDEFINED'}</li>
        <li><strong>VITE_REACT_APP_SUPABASE_URL:</strong> {reactUrl ? 'DEFINED' : 'UNDEFINED'}</li>
        <li><strong>VITE_REACT_APP_SUPABASE_ANON_KEY:</strong> {reactKey ? 'DEFINED' : 'UNDEFINED'}</li>
      </ul>
      {import.meta.env.MODE === 'development' && (
        <>
          <h2>All Environment Variables (Development Only):</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(import.meta.env, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root')
if (rootElement) {
  console.log('Root element found, creating React root...');
  const root = createRoot(rootElement)
  root.render(<MinimalApp />)
  console.log('React app rendered successfully');
} else {
  console.error('Root element not found!');
}
