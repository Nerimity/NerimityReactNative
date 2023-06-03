import {NavigationProp, RouteProp, useRoute} from '@react-navigation/native';
import React, {useEffect} from 'react';

import {View, StyleSheet, Text} from 'react-native';
import {RootStackParamList} from '../../App';
import {useStore} from '../store/store';
import useAwait from '../utils/useAwait';
import {fetchMessages} from '../services/MessageService';

export type MainScreenRouteProp = RouteProp<RootStackParamList, 'Message'>;
export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export default function MessagesView() {
  const route = useRoute<MainScreenRouteProp>();
  const messages = useAwait(fetchMessages(route.params.channelId));

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  return (
    <View style={styles.pageContainer}>
      <Header />
      <Text>test</Text>
    </View>
  );
}

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
