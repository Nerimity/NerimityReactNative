import {NavigationProp, RouteProp, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';

import {View, StyleSheet, FlatList, TextInput} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';
import {observer} from 'mobx-react-lite';
import MessageItem from './MessageItem';

import CustomButton from './ui/CustomButton';
import Header from './ui/Header';
import Colors from './ui/Colors';

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
      <PageHeader />
      <MessageList />
      <InputArea />
    </View>
  );
}

const MessageList = observer(() => {
  const messages = useChannelMessages();

  return (
    <FlatList
      data={(messages || []).slice()}
      keyExtractor={item => item.id}
      renderItem={props => <MessageItem {...props} />}
      inverted
      showsVerticalScrollIndicator={false}
    />
  );
});

const InputArea = () => {
  return (
    <View>
      <CustomInput />
    </View>
  );
};

const CustomInput = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {messages} = useStore();
  const [message, setMessage] = useState('');
  const onSend = useCallback(() => {
    if (!message.trim().length) {
      return;
    }
    messages.postMessage(route.params.channelId, message);
    setMessage('');
  }, [message, messages, route.params.channelId]);

  return (
    <View style={styles.customInputContainer}>
      <TextInput
        style={styles.customInput}
        placeholder="Message..."
        multiline
        onChangeText={text => setMessage(text)}
        defaultValue={message}
      />
      <CustomButton
        icon="send"
        onPress={onSend}
        styles={{paddingLeft: 20, paddingRight: 20}}
      />
    </View>
  );
};

const PageHeader = () => {
  const route = useRoute<MainScreenRouteProp>();
  const {channels} = useStore();

  const channel = channels.cache[route.params.channelId];
  return <Header title={channel?.name || '...'} />;
};

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    height: '100%',
  },
  customInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    margin: 5,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderBottomColor: Colors.primaryColor,
    borderBottomWidth: 2,
    paddingLeft: 10,
    alignItems: 'flex-end',
  },
  customInput: {
    flex: 1,
  },
});
