import React from 'react';
import {observer} from 'mobx-react-lite';
import {View, StyleSheet, StatusBar} from 'react-native';
import {useStore} from '../store/store';

import {NavigationProp, RouteProp, useRoute} from '@react-navigation/native';
import CustomPressable from './ui/CustomPressable';
import Avatar from './ui/Avatar';
import {RootStackParamList} from '../../App';
import Colors from './ui/Colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import SettingsScreen from './SettingsScreen';

import {ServerList, ServerPane} from './ServerView';
import {InboxPane} from './InboxView';
import FriendsScreen from './FriendsScreen';
import {FriendStatus} from '../store/RawData';

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.backgroundColor,
    flexDirection: 'row',
    flex: 1,
  },
  serverListContainer: {height: '100%', marginLeft: 5, marginRight: 5},
  pane: {
    backgroundColor: Colors.paneColor,

    flex: 1,
    margin: 10,
    marginLeft: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  serverChannelListContainer: {
    flex: 1,
    paddingLeft: 5,
    paddingRight: 5,
  },
  serverCategoryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 5,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  serverCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
    gap: 5,
  },
  serverChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },
  hashIcon: {
    opacity: 0.2,
    fontSize: 16,
    marginRight: 5,
  },
  serverItemContainer: {
    margin: 10,
  },
  serverChannelName: {
    color: 'rgb(255,255,255)',
  },
  tabBarContainer: {
    backgroundColor: Colors.backgroundColor,
  },
  tabBarInnerContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.paneColor,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    height: 60,
    gap: 5,
  },
  tabBarItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: 50,
  },
  inboxScrollView: {
    padding: 5,
  },
  friendItem: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 10,
  },
  indexFriendCategory: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 5,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  indexFriendCategoryTitle: {
    paddingLeft: 5,
  },
});

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export type LoggedInTabParamList = {
  Home: {serverId?: string};
  Friends: undefined;
  Settings: {};
};
export type LoggedInTabRouteProp = RouteProp<LoggedInTabParamList, 'Home'>;
export type LoggedInTabNavigationProp = NavigationProp<LoggedInTabParamList>;

const Tab = createBottomTabNavigator<LoggedInTabParamList>();

const TabBar = observer((props: BottomTabBarProps) => {
  const {account} = useStore();

  const selectedIndex = props.state.index;
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInnerContainer}>
        <InboxTabItem {...props} selected={selectedIndex === 0} />
        <FriendsTabItem {...props} selected={selectedIndex === 1} />
        <TabBarItem
          selected={selectedIndex === 2}
          onPress={() => props.navigation.navigate('Settings', {})}>
          {account.user && <Avatar user={account.user} size={25} />}
        </TabBarItem>
      </View>
    </View>
  );
});

const InboxTabItem = observer(
  (props: BottomTabBarProps & {selected: boolean}) => {
    const {inbox, servers} = useStore();

    const inboxNotificationCount = inbox.notificationCount;
    const hasServerNotifications = servers.hasNotifications;

    const hasNotifications = inboxNotificationCount || hasServerNotifications;

    return (
      <TabBarItem
        alert={!!hasNotifications}
        selected={!!hasNotifications || props.selected}
        onPress={() => props.navigation.navigate('Home', {})}>
        <Icon name="all-inbox" size={25} />
      </TabBarItem>
    );
  },
);

const FriendsTabItem = observer(
  (props: BottomTabBarProps & {selected: boolean}) => {
    const {friends} = useStore();

    const hasFriendRequest = !!friends.array.find(
      f => f.status === FriendStatus.PENDING,
    );
    return (
      <TabBarItem
        alert={hasFriendRequest}
        selected={hasFriendRequest || props.selected}
        onPress={() => props.navigation.navigate('Friends')}>
        <Icon name="group" size={25} />
      </TabBarItem>
    );
  },
);
const TabBarItem = (props: {
  children?: React.JSX.Element | null;
  onPress?(): void;
  selected?: boolean;
  alert?: boolean;
}) => {
  return (
    <CustomPressable
      handlePosition="bottom"
      handleColor={props.alert ? Colors.alertColor : undefined}
      selected={props.selected}
      onPress={props.onPress}>
      <View style={styles.tabBarItemContainer}>{props.children}</View>
    </CustomPressable>
  );
};

export default function LoggedInView() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{headerShown: false}}
      detachInactiveScreens>
      <Tab.Screen name="Home" component={ServerScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function ServerScreen() {
  return (
    <View style={styles.pageContainer}>
      <StatusBar backgroundColor={Colors.backgroundColor} />
      <ServerList />
      <Pane />
    </View>
  );
}

const Pane = () => {
  const route = useRoute<MainScreenRouteProp>();
  return (
    <View style={styles.pane}>
      {route.params?.serverId && (
        <ServerPane serverId={route.params.serverId} />
      )}
      {!route.params?.serverId && <InboxPane />}
    </View>
  );
};
