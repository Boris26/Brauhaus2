import './colors.css';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import App from './containers/App';
import { resolveInitialTheme } from './utils/theme';
import { ApplicationActions } from './actions/actions';
import { debugMetrics } from './utils/debugMetrics';
import { dataCollector } from './utils/DataCollector/dataCollector';

store.dispatch(ApplicationActions.setTheme(resolveInitialTheme()));

debugMetrics.start(
    () => store.getState(),
    () => dataCollector.getMeasurementCount()
);
window.addEventListener('beforeunload', (): void => {
    debugMetrics.stop();
});

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

// Register the service worker for PWA support in production builds only.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(process.env.PUBLIC_URL + '/service-worker.js')
      .then(registration => {
        console.info('ServiceWorker registration successful:', registration.scope);
      })
      .catch(error => {
        console.warn('ServiceWorker registration failed:', error);
      });
  });
}
