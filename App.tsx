import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
} from 'react-native';

import LoggedInView from './src/components/LoggedInView';
import { StoreProvider } from './src/store/store';

function App(): JSX.Element {
  return (
    <StoreProvider>
      <SafeAreaView>
        <LoggedInView />
      </SafeAreaView>
    </StoreProvider>
  );
}

export default App;
