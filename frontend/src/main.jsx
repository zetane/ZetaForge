import App from '@/App.jsx';
import * as Sentry from "@sentry/electron/renderer";
import { init as reactInit } from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
// import './App.css'; // Import global styles

import './demos/ipc';
//import './demos/node'

Sentry.init(
  {
    dsn: "https://7fb18e8e487455a950298625457264f3@o1096443.ingest.us.sentry.io/4507031960223744",
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost"],
  },
  reactInit
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
