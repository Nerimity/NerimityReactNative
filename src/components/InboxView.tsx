import React, {startTransition} from 'react';
import {observer} from 'mobx-react-lite';
import {ScrollView, Text, View, StyleSheet} from 'react-native';
import {useStore} from '../store/store';

import {NavigationProp, useNavigation} from '@react-navigation/native';
import CustomPressable from './ui/CustomPressable';
import Avatar from './ui/Avatar';
import {RootStackParamList} from '../../App';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {FriendStatus} from '../store/RawData';

import {Friend} from '../store/friends';
import UserPresence from './UserPresence';
import {User} from '../store/users';

const styles = StyleSheet.create({
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
  );
});

const useRecent = () => {
  const {mentions, channels, users, inbox} = useStore();
  const mentionUserArray = mentions.array
    .filter(m => {
      const channel = channels.get(m?.channelId!);
      return !channel?.serverId;
    })
    .map(m => users.get(m?.userId!));

  console.log(mentionUserArray);

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
        <FriendItem key={user.id} user={user} />
      ))}
    </ScrollView>
  );
});

const IndexFriendCategory = (props: {friends: Friend[]; title: String}) => {
  return (
    <View style={styles.indexFriendCategory}>
      <Text numberOfLines={1} style={styles.indexFriendCategoryTitle}>
        {props.title}
      </Text>
      {props.friends.map(friend => (
        <FriendItem key={friend.recipientId} friend={friend} />
      ))}
    </View>
  );
};

const FriendItem = observer((props: {friend?: Friend; user?: User}) => {
  const nav = useNavigation<MainScreenNavigationProp>();
  const {mentions} = useStore();
  const user = (props.friend?.recipient || props.user) as User;
  const notificationCount = mentions.getDmCount(user.id);

  const onPress = async () => {
    const channel = await user.openDMChannel();
    startTransition(() =>
      nav.navigate('Message', {
        channelId: channel?.id!,
      }),
    );
  };

  return (
    <CustomPressable
      selected={notificationCount > 0}
      handleColor={Colors.alertColor}
      unstable_pressDelay={100}
      onPress={onPress}>
      <View style={styles.friendItem}>
        <Avatar user={user} size={30} />
        <View style={{flex: 1}}>
          <Text numberOfLines={1}>{user.username}</Text>
          <UserPresence showOffline={false} userId={user.id} />
        </View>
      </View>
    </CustomPressable>
  );
});
