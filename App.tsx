import React, {useEffect} from 'react';
import {
  CommonActions,
  NavigationContainer,
  NavigationContainerRef,
  useNavigationContainerRef,
} from '@react-navigation/native';

import LoggedInView from './src/components/LoggedInView';
import MessagesView from './src/components/MessagesView';
import {StoreProvider} from './src/store/store';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ChannelDetailsView from './src/components/ChannelDetailsView';
import LoginView from './src/components/LoginView';
import SplashScreen from './src/components/SplashScreen';
import {Release, getLatestRelease} from './src/utils/githubApi';
import {
  getLastUpdateCheckedDate,
  storeLastUpdateCheckedDate,
} from './src/utils/EncryptedStore';
import env from './src/utils/env';
import {Alert, Linking} from 'react-native';
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: {serverId?: string};
  Message: {channelId: string; serverId?: string};
  ChannelDetails: {channelId: string; serverId?: string};
};

import notifee, {EventType} from '@notifee/react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  useEffect(() => {
    const updateAlert = (release: Release) => {
      const onUpdateNow = () =>
        release.mainAssetUrl && Linking.openURL(release.mainAssetUrl);
      const onViewChangelog = () => {
        updateAlert(release);
        Linking.openURL(release.html_url);
      };

      Alert.alert(
        'Update Available',
        'A new version of Nerimity is available',
        [
          {text: 'Later'},
          {
            text: 'View Changelog',
            onPress: onViewChangelog,
          },
          {
            isPreferred: true,
            text: 'Update Now',
            onPress: onUpdateNow,
          },
        ],
      );
    };

    const checkForUpdate = async () => {
      if (env.DEV_MODE) {
        return;
      }
      const lastChecked = await getLastUpdateCheckedDate();
      const lastCheckedDiff = Date.now() - lastChecked;
      const tenMinutesToMilliseconds = 600000;
      const checkNow = lastCheckedDiff >= tenMinutesToMilliseconds;
      if (checkNow) {
        storeLastUpdateCheckedDate();
        const latestRelease = await getLatestRelease();

        if (latestRelease.tag_name !== env.APP_VERSION) {
          updateAlert(latestRelease);
        }
      }
    };
    checkForUpdate();
  }, []);

  const handleAppOpenedByNotificationPress = async () => {
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification?.notification) {
      handleNotificationClick(initialNotification?.notification);
    }
  };

  const handleNotificationClick = (notification: any) => {
    const serverId = notification?.data?.serverId;
    const channelId = notification?.data?.channelId;
    setTimeout(() => {
      navigationRef.navigate('Main', {
        serverId: serverId as string | undefined,
      });
      navigationRef.dispatch(
        CommonActions.navigate('Home', {
          serverId: serverId as string | undefined,
        }),
      );
      navigationRef.navigate('Message', {
        channelId: channelId as string,
      });
    }, 500);
  };

  useEffect(() => {
    handleAppOpenedByNotificationPress();
    return notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        handleNotificationClick(detail.notification);
      }
    });
  }, []);

  return (
    <StoreProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{headerShown: false}}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginView} />
          <Stack.Screen name="Main" component={LoggedInView} />
          <Stack.Screen name="Message" component={MessagesView} />
          <Stack.Screen name="ChannelDetails" component={ChannelDetailsView} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

export default App;
