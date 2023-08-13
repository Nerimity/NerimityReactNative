import React, {useEffect, useState} from 'react';
import {observer} from 'mobx-react-lite';

import {Modal} from '../ui/Modal';
import {StyleSheet, Text, View} from 'react-native';
import {useStore} from '../../store/store';
import Banner from '../ui/Banner';
import Avatar from '../ui/Avatar';
import {RawUser} from '../../store/RawData';
import {User} from '../../store/users';
import {UserDetails, fetchUser} from '../../services/UserService';

export const ProfileContextMenu = observer(
  (props: {close: () => void; userId: string; user?: RawUser | User}) => {
    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const {users} = useStore();
    const cacheUser = users.get(props.userId);

    const user = userDetails?.user || props.user || cacheUser;

    useEffect(() => {
      fetchUser(props.userId).then(res => setUserDetails(res));
    }, [props.userId]);

    return (
      <Modal close={props.close}>
        {user ? (
          <View style={styles.modalContainer}>
            <BannerArea user={user} />
          </View>
        ) : (
          <Text>Loading...</Text>
        )}
      </Modal>
    );
  },
);

function BannerArea(props: {user: RawUser | User}) {
  return (
    <View style={styles.bannerOuterContainer}>
      <Banner margin={0} user={props.user!}>
        <View style={styles.bannerContainer}>
          <Avatar user={props.user!} size={80} />
          <Text style={styles.usernameAndTag}>
            {props.user?.username}
            <Text style={styles.userTag}>:{props.user?.tag}</Text>
          </Text>
        </View>
      </Banner>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {},
  bannerOuterContainer: {
    marginBottom: 60,
  },
  bannerContainer: {marginTop: 'auto', marginBottom: -60, marginLeft: 15},
  usernameAndTag: {
    marginTop: 5,
    marginLeft: -10,
    fontSize: 16,
  },
  userTag: {color: 'rgba(255,255,255,0.4)'},
});
