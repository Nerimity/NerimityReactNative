import React from 'react';
import {
  NavigationContainer,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';

import LoggedInView from './src/components/LoggedInView';
import {StoreProvider} from './src/store/store';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: {serverId?: string};
};
export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;

export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <StoreProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Main" component={LoggedInView} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

export default App;
