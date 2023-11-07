import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, Text, View, StyleSheet} from 'react-native';
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
import Header from './ui/Header';
import Colors from './ui/Colors';
import {ChannelType} from '../store/RawData';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../../App';
import env from '../utils/env';
import {unicodeToTwemojiUrl} from '../utils/emoji/emoji';
import FastImage from 'react-native-fast-image';

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export type LoggedInTabParamList = {
  Home: {serverId?: string};
  Settings: {serverId?: string};
};
export type LoggedInTabRouteProp = RouteProp<LoggedInTabParamList, 'Home'>;
export type LoggedInTabNavigationProp = NavigationProp<LoggedInTabParamList>;

const styles = StyleSheet.create({
  serverListContainer: {height: '100%', marginLeft: 5, marginRight: 5},

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
    gap: 4,
  },
  serverChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 10,
    width: '100%',
  },
  hashIcon: {
    opacity: 0.4,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  channelIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    overflow: 'hidden',
    width: 19,
    height: 19,
  },
  serverItemContainer: {
    margin: 10,
  },
  serverChannelName: {
    color: 'rgb(255,255,255)',
  },
});

export const ServerPane = (props: {serverId: string}) => {
  return (
    <>
      <ServerHeader serverId={props.serverId} />
      <ServerChannelList serverId={props.serverId} />
    </>
  );
};

const ServerHeader = observer((props: {serverId: string}) => {
  const {servers} = useStore();

  const server = servers.cache[props.serverId];

  return <Header title={server?.name || '...'} />;
});

const ServerChannelList = observer((props: {serverId: string}) => {
  const {channels} = useStore();

  const serverChannels = channels.getSortedChannelsByServerId(props.serverId);

  return (
    <ScrollView style={styles.serverChannelListContainer}>
      {serverChannels.map(channel => {
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
        <ChannelIcon type={props.category.type} icon={props.category.icon} />
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
        <ChannelIcon type={props.channel.type} icon={props.channel.icon} />
        <Text numberOfLines={1} style={styles.serverChannelName}>
          {props.channel.name}
        </Text>
      </View>
    </CustomPressable>
  );
});

export const ServerList = observer(() => {
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

export const ChannelIcon = (props: {icon?: string; type?: ChannelType}) => {
  const url = () => {
    if (props.icon!.includes('.')) {
      return `${env.NERIMITY_CDN}emojis/${props.icon}${
        props.icon?.endsWith('.gif') ? '?type=webp' : ''
      }`;
    }
    return unicodeToTwemojiUrl(props.icon!);
  };

  if (props.icon) {
    return (
      <View style={styles.channelIcon}>
        <FastImage
          style={{width: '100%', height: '100%'}}
          source={{
            uri: url(),
            priority: FastImage.priority.normal,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (props.type === ChannelType.SERVER_TEXT) {
    return (
      <View style={styles.channelIcon}>
        <Text style={styles.hashIcon}>#</Text>
      </View>
    );
  }

  if (props.type === ChannelType.CATEGORY) {
    return (
      <View style={styles.channelIcon}>
        <Icon name="segment" color="rgba(255,255,255,0.6)" size={18} />
      </View>
    );
  }

  return null;
};

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
