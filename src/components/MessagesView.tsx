import {NavigationProp, RouteProp, useRoute} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';

import {View, ScrollView, StyleSheet, Text} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';
import {observer} from 'mobx-react-lite';
import {RawMessage} from '../store/RawData';
import Avatar from './ui/Avatar';

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Message'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

const useChannelMessages = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages} = useStore();
  const channelMessages = messages.channelMessages(route.params.channelId);

  useEffect(() => {
    messages.fetchAndCacheMessages(route.params.channelId);
  }, [messages, route.params.channelId]);
  return channelMessages;
};

export default function MessagesView() {
  return (
    <View style={styles.pageContainer}>
      <Header />
      <MessageList />
    </View>
  );
}

const MessageList = observer(() => {
  const messages = useChannelMessages();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setLoad(true);
    }, 50);
  }, []);

  return (
    <ScrollView>
      {load &&
        messages &&
        messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
    </ScrollView>
  );
});

const MessageItem = (props: {message: RawMessage}) => {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Avatar size={20} user={props.message.createdBy} />
      <Text>{props.message.content}</Text>
    </View>
  );
};

const Header = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {channels} = useStore();

  const channel = channels.cache[route.params.channelId];
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{channel?.name || '...'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: '#232629',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    padding: 15,
  },
  headerText: {
    color: 'white',
  },
});
