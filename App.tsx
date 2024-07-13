import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {
  CommonActions,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';

import {StoreProvider, useStore} from './src/store/store';
import {
  createNativeStackNavigator,
  NativeStackHeaderProps,
} from '@react-navigation/native-stack';

import SplashScreen from './src/components/SplashScreen';
const LoginView = React.lazy(() => import('./src/components/LoginView'));
const ChannelDetailsView = React.lazy(
  () => import('./src/components/ChannelDetailsView'),
);
const MessagesView = React.lazy(() => import('./src/components/MessagesView'));
const LoggedInView = React.lazy(() => import('./src/components/LoggedInView'));

import {Release, getLatestRelease} from './src/utils/githubApi';
import {
  getLastUpdateCheckedDate,
  storeLastUpdateCheckedDate,
} from './src/utils/EncryptedStore';
import env from './src/utils/env';
import {Alert, AppState, Linking, Text, View} from 'react-native';
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: {serverId?: string};
  Message: {channelId: string; serverId?: string};
  ChannelDetails: {channelId: string; serverId?: string};
};

import notifee, {EventType, Notification} from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {handlePushNotification} from './src/utils/pushNotifications';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import Colors from './src/components/ui/Colors';
import {observer} from 'mobx-react-lite';
import Show from './src/components/ui/Show';

const Stack = createNativeStackNavigator<RootStackParamList>();

async function onMessageReceived(
  message: FirebaseMessagingTypes.RemoteMessage,
) {
  handlePushNotification(message.data as any);
}

messaging().onMessage(onMessageReceived);
messaging().setBackgroundMessageHandler(onMessageReceived);

let backgroundClickedNotification: Notification | undefined;
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification} = detail;
  if (type === EventType.PRESS) {
    backgroundClickedNotification = notification;
  }
});

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
          storeLastUpdateCheckedDate(0);
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

  const onFocus = async () => {
    if (backgroundClickedNotification) {
      handleNotificationClick(backgroundClickedNotification);
    }
    backgroundClickedNotification = undefined;
  };

  useEffect(() => {
    handleAppOpenedByNotificationPress();
    const disposeForegroundEvent = notifee.onForegroundEvent(
      ({type, detail}) => {
        if (type === EventType.PRESS) {
          handleNotificationClick(detail.notification);
        }
      },
    );

    const event = AppState.addEventListener('focus', onFocus);

    return () => {
      disposeForegroundEvent();
      event.remove();
    };
  }, []);

  const [showConnectionStatus, setShowConnectionStatus] = useState(true);

  const ConnectionStatusWrapper = useCallback(
    (props: NativeStackHeaderProps) => {
      return (
        <ConnectionStatus
          {...props}
          visible={showConnectionStatus}
          setVisible={setShowConnectionStatus}
        />
      );
    },
    [showConnectionStatus],
  );

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <StoreProvider>
        <NavigationContainer ref={navigationRef}>
          <BottomSheetModalProvider>
            <View style={{height: '100%'}}>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                  header: ConnectionStatusWrapper,
                }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginView} />
                <Stack.Screen name="Main" component={LoggedInView} />
                <Stack.Screen name="Message" component={MessagesView} />
                <Stack.Screen
                  name="ChannelDetails"
                  component={ChannelDetailsView}
                />
              </Stack.Navigator>
            </View>
          </BottomSheetModalProvider>
        </NavigationContainer>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

export default App;

type ConnectionStatusProps = NativeStackHeaderProps & {
  visible: boolean;
  setVisible: (value: boolean) => void;
};
const ConnectionStatus = (props: ConnectionStatusProps) => {
  const blacklist = ['Splash', 'Login'];
  const routeName = props.route.name;

  if (blacklist.includes(routeName)) {
    return null;
  }

  return <ConnectionStatusInner {...props} />;
};

const ConnectionStatusInner = observer((props: ConnectionStatusProps) => {
  const store = useStore();

  const details = useCallback(() => {
    if (store.socket.authError?.message) {
      return {
        color: Colors.alertColor,
        text: store.socket.authError.message,
      };
    }
    if (store.socket.isAuthenticated) {
      return {
        color: Colors.successColor,
        text: 'Connected!',
      };
    }

    if (store.socket.isConnected && !store.socket.isAuthenticated) {
      return {
        color: Colors.warnColor,
        text: 'Authenticating...',
      };
    }

    if (!store.socket.isConnected) {
      return {
        color: Colors.warnColor,
        text: 'Connecting...',
      };
    }
  }, [
    store.socket.authError,
    store.socket.isAuthenticated,
    store.socket.isConnected,
  ]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    if (details()?.text === 'Connected!') {
      timeout = setTimeout(() => {
        props.setVisible(false);
      }, 3000);
      return;
    }
    clearTimeout(timeout);
    props.setVisible(true);
  }, [details, props]);

  return (
    <Show when={props.visible}>
      <View style={{backgroundColor: details()?.color}}>
        <Text style={{textAlign: 'center'}}>{details()?.text}</Text>
      </View>
    </Show>
  );
});
