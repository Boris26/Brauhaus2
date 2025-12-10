import './colors.css';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import App from './containers/App';
import { applyTheme, getStoredTheme, ThemeName } from './utils/theme';

const setInitialTheme = (): void => {
    const storedTheme = getStoredTheme();

    if (storedTheme) {
        applyTheme(storedTheme);
        return;
    }

    const prefersDarkAlt = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDarkAlt ? 'dark-alt' : 'default');
};

setInitialTheme();

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

// Service Worker für PWA registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(process.env.PUBLIC_URL + '/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}
