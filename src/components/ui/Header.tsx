import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useStore} from '../../store/store';
import Avatar from './Avatar';
import UserPresence from '../UserPresence';
import {observer} from 'mobx-react-lite';

export default observer(
  (props: {
    title?: string;
    icon?: string;
    userId?: string;
    serverId?: string;
    channelId?: string;
    onPress?(event: GestureResponderEvent): void;
  }) => {
    const {users, servers, channels} = useStore();

    const user = props.userId ? users.get(props.userId) : undefined;
    const server = props.serverId ? servers.get(props.serverId) : undefined;
    const userOrServer = user || server;
    const channel = props.channelId ? channels.get(props.channelId) : undefined;

    const name = () => {
      if (props.title) {
        return props.title;
      }
      if (user) {
        return user.username;
      }
      if (server?.name && channel?.id) {
        return channel.name;
      }
      return '...';
    };

    return (
      <Pressable style={styles.header} onPress={props.onPress}>
        <View style={styles.innerHeader}>
          {userOrServer && <Avatar size={30} server={server} user={user} />}
          <View style={styles.details}>
            <Text numberOfLines={1} style={styles.headerText}>
              {name()}
            </Text>
            {props.userId && (
              <UserPresence showOffline={false} userId={props.userId} />
            )}
            {props.serverId && <Text>{server?.name}</Text>}
          </View>
        </View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  header: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
  },
  innerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 50,
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  details: {},
});
