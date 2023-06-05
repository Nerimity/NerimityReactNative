import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, Text, View, StyleSheet} from 'react-native';
import {useStore} from '../store/store';
import {Server} from '../store/servers';
//import {NativeStackScreenProps} from '@react-navigation/native-stack';
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

// type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;
const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.backgroundColor,
    flexDirection: 'row',
  },
  serverListContainer: {height: '100%', marginLeft: 5, marginRight: 5},
  serverPane: {
    backgroundColor: 'rgb(35 38 41)',
    padding: 5,
    flex: 1,
    margin: 10,
    marginLeft: 0,
    borderRadius: 16,
  },
  serverChannelListContainer: {
    paddingTop: 5,
  },
  serverChannelItem: {
    marginLeft: 13,
    padding: 10,
    width: '100%',
  },
  serverItemContainer: {
    margin: 10,
  },
});

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export default function LoggedInView() {
  return (
    <View style={styles.pageContainer}>
      <View>
        <ServerList />
      </View>

      <ServerPane />
    </View>
  );
}

const ServerPane = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {servers} = useStore();

  const server = servers.cache[route.params?.serverId!];

  return (
    <View style={styles.serverPane}>
      <Header title={server?.name || '...'} />
      <ServerChannelList channels={server?.channels || []} />
    </View>
  );
};

const ServerChannelList = observer((props: {channels: Channel[]}) => {
  return (
    <View style={styles.serverChannelListContainer}>
      {props.channels.map(channel => (
        <ServerChannelItem key={channel.id} channel={channel} />
      ))}
    </View>
  );
});

const ServerChannelItem = (props: {channel: Channel}) => {
  const nav = useNavigation<MainScreenNavigationProp>();
  return (
    <CustomPressable
      onPress={() =>
        startTransition(() =>
          nav.navigate('Message', {
            channelId: props.channel.id,
            serverId: props.channel.serverId,
          }),
        )
      }>
      <View style={styles.serverChannelItem}>
        <Text numberOfLines={1} style={{color: 'rgb(255,255,255)'}}>
          {props.channel.name}
        </Text>
      </View>
    </CustomPressable>
  );
};

const ServerList = observer(() => {
  const {servers} = useStore();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.serverListContainer}>
      {servers.array.map(server => (
        <ServerItem server={server} key={server.id} />
      ))}
    </ScrollView>
  );
});

const ServerItem = (props: {server: Server}) => {
  const nav = useNavigation<MainScreenNavigationProp>();
  const route = useRoute<MainScreenRouteProp>();

  const selected = route.params?.serverId === props.server.id;

  return (
    <CustomPressable
      selected={selected}
      onPress={() =>
        startTransition(() => nav.navigate('Main', {serverId: props.server.id}))
      }>
      <View style={styles.serverItemContainer}>
        <Avatar size={50} server={props.server} />
      </View>
    </CustomPressable>
  );
};
