import React, { JSX } from 'react';
import { Text, View } from 'react-native';

import { useUpdateChecker } from './src/hooks/useUpdateChecker';

function App(): JSX.Element {
  useUpdateChecker();

  return (
    <View>
      <Text>3.0</Text>
    </View>
  );
}

export default App;
