/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

notifee.registerForegroundService(() => {
  return new Promise(() => {
    // Keep the promise unresolved to keep the service alive
    // It will be stopped when stopForegroundService() is called
  });
});

AppRegistry.registerComponent(appName, () => App);
