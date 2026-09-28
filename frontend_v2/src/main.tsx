import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './koncept.css';
import { installeraTestlage } from './testlage';

if (import.meta.env.VITE_TESTLAGE === '1') installeraTestlage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
