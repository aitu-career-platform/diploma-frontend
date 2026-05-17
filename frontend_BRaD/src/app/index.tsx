import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './providers/router';
import { UISettingsProvider } from '@shared/lib/ui-settings';
import '@shared/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UISettingsProvider>
      <AppRouter />
    </UISettingsProvider>
  </React.StrictMode>
);

