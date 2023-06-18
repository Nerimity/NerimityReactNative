import React from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, StyleSheet} from 'react-native';
import {useStore} from '../store/store';

import {NavigationProp} from '@react-navigation/native';

import {RootStackParamList} from '../../App';
import Header from './ui/Header';

import {FriendItem} from './FriendItem';

const styles = StyleSheet.create({
  inboxScrollView: {
    padding: 5,
  },
});

export type MainScreenNavigationProp = NavigationProp<RootStackParamList>;

export const InboxPane = () => {
  return (
    <>
      <Header title="Inbox" />
      {/* <FriendPane /> */}
      <RecentPane />
    </>
  );
};

const useRecent = () => {
  const {mentions, channels, users, inbox} = useStore();
  const mentionUserArray = mentions.array
    .filter(m => {
      const channel = channels.get(m?.channelId!);
      return !channel?.serverId;
    })
    .map(m => users.get(m?.userId!));

  const newUsers = [...mentionUserArray];
  const inboxArray = inbox.array.sort((a, b) => {
    const aTime = a.channel?.lastMessagedAt!;
    const bTime = b.channel?.lastMessagedAt!;
    return bTime - aTime;
  });

  for (let i = 0; i < inboxArray.length; i++) {
    const inboxItem = inboxArray[i];
    const alreadyExists = newUsers.find(
      u => u?.id === inboxItem.channel?.recipient?.id,
    );
    if (!alreadyExists) {
      newUsers.push(inboxItem.channel?.recipient!);
    }
  }
  return newUsers;
};

const RecentPane = observer(() => {
  const recents = useRecent();
  return (
    <ScrollView style={styles.inboxScrollView}>
      {recents.map(user => (
        <FriendItem key={user?.id} user={user} />
      ))}
    </ScrollView>
  );
});
