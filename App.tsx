import React from 'react';
import {NavigationContainer} from '@react-navigation/native';

import LoggedInView from './src/components/LoggedInView';
import MessagesView from './src/components/MessagesView';
import {StoreProvider} from './src/store/store';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: {serverId?: string};
  Message: {channelId: string; serverId?: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <StoreProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Main" component={LoggedInView} />
          <Stack.Screen name="Message" component={MessagesView} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

export default App;
