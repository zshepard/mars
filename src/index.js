// src/index.js
import React     from 'react';
import ReactDOM  from 'react-dom/client';
import App       from './App';
import * as SW   from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

SW.register({
  onSuccess: () => console.log('[MARS] Offline mode ready.'),
  onUpdate:  () => console.log('[MARS] New version available.'),
});
