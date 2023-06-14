import React from 'react';
import {userStatusDetail} from '../utils/userStatus';
import {useStore} from '../store/store';
import {StyleSheet, View} from 'react-native';
import Markup from './Markup';
import {observer} from 'mobx-react-lite';

const UserPresence = observer(
  (props: {userId: string; showOffline: boolean; animate?: boolean}) => {
    const {users} = useStore();
    const user = users.get(props.userId);
    const statusDetails = userStatusDetail(user?.presence?.status || 0);

    if (!props.showOffline && !user?.presence?.status) {
      return null;
    }

    if (!statusDetails) {
      return null;
    }

    return (
      <View style={styles.userPresence}>
        <View style={[styles.dot, {backgroundColor: statusDetails.color}]} />
        <View style={{opacity: 0.8}}>
          <Markup inline text={user?.presence?.custom || statusDetails?.name} />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  userPresence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 8,
  },
});

export default UserPresence;
