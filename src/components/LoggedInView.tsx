import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, Text, View, StyleSheet, StatusBar} from 'react-native';
import {useStore} from '../store/store';
import {Server} from '../store/servers';

import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {Channel} from '../store/channels';
import CustomPressable from './ui/CustomPressable';
import Avatar from './ui/Avatar';
import {RootStackParamList} from '../../App';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {ChannelType, FriendStatus} from '../store/RawData';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import SettingsScreen from './SettingsScreen';
import {Friend} from '../store/friends';
import UserPresence from './UserPresence';

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
    padding: 5,
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
  Settings: {serverId?: string};
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
        <TabBarItem
          selected={selectedIndex === 0}
          onPress={() => props.navigation.navigate('Home', {})}>
          <Icon name="all-inbox" size={25} />
        </TabBarItem>
        <TabBarItem
          selected={selectedIndex === 1}
          onPress={() => props.navigation.navigate('Settings', {})}>
          {account.user && <Avatar user={account.user} size={25} />}
        </TabBarItem>
      </View>
    </View>
  );
});

const TabBarItem = (props: {
  children?: React.JSX.Element | null;
  onPress?(): void;
  selected?: boolean;
}) => {
  return (
    <CustomPressable
      handlePosition="bottom"
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

const separateFriends = (friends: Friend[]) => {
  const requests = [];
  const onlineFriends = [];
  const offlineFriends = [];

  for (let i = 0; i < friends.length; i++) {
    const friend = friends[i];
    const user = friend.recipient;
    if (
      friend.status === FriendStatus.PENDING ||
      friend.status === FriendStatus.SENT
    ) {
      // move incoming requests to the top.
      if (friend.status === FriendStatus.PENDING) {
        requests.unshift(friend);
        continue;
      }
      requests.push(friend);
      continue;
    }
    if (!user.presence?.status) {
      offlineFriends.push(friend);
      continue;
    }
    onlineFriends.push(friend);
  }
  return {requests, onlineFriends, offlineFriends};
};
const InboxPane = observer(() => {
  const {friends} = useStore();
  const separated = separateFriends(friends.array);
  return (
    <>
      <Header title="Inbox" />
      <ScrollView style={styles.inboxScrollView}>
        {!!separated.requests.length && (
          <IndexFriendCategory
            friends={separated.requests}
            title={`Requests (${separated.requests.length})`}
          />
        )}
        {!!separated.onlineFriends.length && (
          <IndexFriendCategory
            friends={separated.onlineFriends}
            title={`Online (${separated.onlineFriends.length})`}
          />
        )}
        {!!separated.offlineFriends.length && (
          <IndexFriendCategory
            friends={separated.offlineFriends}
            title={`Offline (${separated.offlineFriends.length})`}
          />
        )}
      </ScrollView>
    </>
  );
});

const IndexFriendCategory = (props: {friends: Friend[]; title: String}) => {
  return (
    <View style={styles.indexFriendCategory}>
      <Text style={styles.indexFriendCategoryTitle}>{props.title}</Text>
      {props.friends.map(friend => (
        <FriendItem key={friend.recipientId} friend={friend} />
      ))}
    </View>
  );
};

const FriendItem = (props: {friend: Friend}) => {
  const user = props.friend.recipient;
  return (
    <CustomPressable unstable_pressDelay={100}>
      <View style={styles.friendItem}>
        <Avatar user={user} size={30} />
        <View>
          <Text>{user.username}</Text>
          <UserPresence showOffline={false} userId={user.id} />
        </View>
      </View>
    </CustomPressable>
  );
};

const ServerPane = (props: {serverId: string}) => {
  const {servers, channels} = useStore();

  const server = servers.cache[props.serverId];
  return (
    <>
      <Header title={server?.name || '...'} />
      <ServerChannelList
        channels={channels.getSortedChannelsByServerId(server?.id)}
      />
    </>
  );
};

const ServerChannelList = observer((props: {channels: Channel[]}) => {
  return (
    <ScrollView style={styles.serverChannelListContainer}>
      {props.channels.map(channel => {
        if (channel.categoryId) {
          return null;
        }
        if (channel.type === ChannelType.CATEGORY) {
          return <ServerCategoryItem key={channel.id} category={channel} />;
        }
        return <ServerChannelItem key={channel.id} channel={channel} />;
      })}
    </ScrollView>
  );
});

const ServerCategoryItem = (props: {category: Channel}) => {
  const {channels} = useStore();
  const categoryChannels = channels
    .getSortedChannelsByServerId(props.category.serverId!)
    .filter(c => c.categoryId === props.category.id);

  return (
    <View style={styles.serverCategoryContainer}>
      <View style={styles.serverCategoryHeader}>
        <Icon name="segment" size={20} />
        <Text>{props.category.name}</Text>
      </View>
      <CategoryChannelList channels={categoryChannels} />
    </View>
  );
};

const CategoryChannelList = (props: {channels: Channel[]}) => {
  return (
    <View>
      {props.channels.map(channel => (
        <ServerChannelItem key={channel.id} channel={channel} />
      ))}
    </View>
  );
};

const ServerChannelItem = observer((props: {channel: Channel}) => {
  const nav = useNavigation<MainScreenNavigationProp>();

  return (
    <CustomPressable
      selected={props.channel.hasNotifications()}
      handleColor={Colors.alertColor}
      onPress={() =>
        startTransition(() =>
          nav.navigate('Message', {
            channelId: props.channel.id,
            serverId: props.channel.serverId,
          }),
        )
      }>
      <View style={styles.serverChannelItem}>
        <Text style={styles.hashIcon}>#</Text>
        <Text numberOfLines={1} style={styles.serverChannelName}>
          {props.channel.name}
        </Text>
      </View>
    </CustomPressable>
  );
});

const ServerList = observer(() => {
  const {servers} = useStore();

  return (
    <View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.serverListContainer}>
        {servers.orderedArray.map(server => (
          <ServerItem server={server} key={server.id} />
        ))}
      </ScrollView>
    </View>
  );
});

const ServerItem = observer((props: {server: Server}) => {
  const nav = useNavigation<LoggedInTabNavigationProp>();
  const route = useRoute<LoggedInTabRouteProp>();

  const selected = route.params?.serverId === props.server.id;

  return (
    <CustomPressable
      selected={selected || !!props.server.hasNotifications}
      handleColor={
        props.server.hasNotifications ? Colors.alertColor : undefined
      }
      onPress={() =>
        startTransition(() => nav.navigate('Home', {serverId: props.server.id}))
      }>
      <View style={styles.serverItemContainer}>
        <Avatar animate={selected} size={50} server={props.server} />
      </View>
    </CustomPressable>
  );
});
