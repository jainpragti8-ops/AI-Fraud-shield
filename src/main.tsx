import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupClientApiFallback } from './services/clientApi';

// Ensure the dashboard functions seamlessly even on static host deployments (Vercel, Netlify, GitHub Pages)
setupClientApiFallback();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
