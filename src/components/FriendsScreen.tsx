import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {useStore} from '../store/store';
import Colors from './ui/Colors';

import {useNavigation} from '@react-navigation/native';
import {observer} from 'mobx-react-lite';
import {FriendStatus} from '../store/RawData';
import {Friend} from '../store/friends';
import {FriendItem} from './FriendItem';
import Header from './ui/Header';

export default function FriendsScreen() {
  const store = useStore();
  const nav = useNavigation();

  return (
    <View style={styles.pageContainer}>
      <Header title="Friends" />
      <View style={styles.pageContainerInner}>
        <FriendPane />
      </View>
    </View>
  );
}

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

const FriendPane = observer(() => {
  const {friends} = useStore();
  const separated = separateFriends(friends.array);
  return (
    <ScrollView style={styles.inboxScrollView}>
      {!!separated.requests.length && (
        <InboxFriendCategory
          friends={separated.requests}
          title={`Requests (${separated.requests.length})`}
        />
      )}
      {!!separated.onlineFriends.length && (
        <InboxFriendCategory
          friends={separated.onlineFriends}
          title={`Online (${separated.onlineFriends.length})`}
        />
      )}
      {!!separated.offlineFriends.length && (
        <InboxFriendCategory
          friends={separated.offlineFriends}
          title={`Offline (${separated.offlineFriends.length})`}
        />
      )}
    </ScrollView>
  );
});

const InboxFriendCategory = (props: {friends: Friend[]; title: String}) => {
  return (
    <View style={styles.inboxFriendCategory}>
      <Text numberOfLines={1} style={styles.inboxFriendCategoryTitle}>
        {props.title}
      </Text>
      {props.friends.map(friend => (
        <FriendItem key={friend.recipientId} friend={friend} />
      ))}
    </View>
  );
};
const styles = StyleSheet.create({
  pageContainer: {
    flexDirection: 'column',
    backgroundColor: Colors.paneColor,
    flex: 1,
  },
  pageContainerInner: {
    flex: 1,
    margin: 2,
    overflow: 'hidden',
  },
  inboxScrollView: {
    padding: 5,
  },
  inboxFriendCategory: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 5,
    borderRadius: 8,
    marginTop: 2,
    marginLeft: 6,
    marginRight: 6,
    marginBottom: 8,
  },
  inboxFriendCategoryTitle: {
    paddingLeft: 5,
  },
});
