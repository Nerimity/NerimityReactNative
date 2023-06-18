import React, {observer} from 'mobx-react-lite';
import {startTransition} from 'react';
import {Friend} from '../store/friends';
import {useNavigation} from '@react-navigation/native';
import {MainScreenNavigationProp} from './LoggedInView';
import {useStore} from '../store/store';
import {User} from '../store/users';
import CustomPressable from './ui/CustomPressable';
import Colors from './ui/Colors';
import Avatar from './ui/Avatar';
import UserPresence from './UserPresence';
import {StyleSheet, Text, View} from 'react-native';

export const FriendItem = observer((props: {friend?: Friend; user?: User}) => {
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

const styles = StyleSheet.create({
  friendItem: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 10,
  },
});
