// src/index.js
import React     from 'react';
import ReactDOM  from 'react-dom/client';
import App       from './App';
import * as SW   from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

SW.register({
  onUpdate: (registration) => {
    // A new service worker has been installed. Tell it to skip waiting and
    // take control immediately, then reload the page so users always get
    // the latest version (including the AI Health Agent tab).
    const waiting = registration.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    }
  },
});
