import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {observer} from 'mobx-react-lite';

import {Modal, ModalRef} from '../ui/Modal';
import {StyleSheet, Text, View} from 'react-native';
import {useStore} from '../../store/store';
import Banner from '../ui/Banner';
import Avatar from '../ui/Avatar';
import {RawUser} from '../../store/RawData';
import {User} from '../../store/users';
import {UserDetails, fetchUser} from '../../services/UserService';
import UserPresence from '../UserPresence';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../ui/Colors';
import Markup from '../Markup';

interface Props {
  user?: RawUser | User;
  userId: string;
}

export const ProfileContextMenu = observer(
  forwardRef<ModalRef, Props>((props, forwardedRef) => {
    const modalRef = useRef<ModalRef>(null);

    useImperativeHandle(forwardedRef, () => modalRef.current as ModalRef);

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const {users} = useStore();
    const cacheUser = users.get(props.userId);
    const [isShowing, setIsShowing] = useState<boolean>(false);

    const user = userDetails?.user || props.user || cacheUser;

    useEffect(() => {
      if (!isShowing) {
        return;
      }
      fetchUser(props.userId).then(res => setUserDetails(res));
    }, [props.userId, isShowing]);

    return (
      <Modal ref={modalRef} onChange={setIsShowing}>
        {user ? (
          <View style={styles.modalContainer}>
            <BannerArea user={user} />
            {userDetails?.profile?.bio && (
              <>
                <Heading icon="info" title="Bio" />
                <Markup text={userDetails?.profile?.bio} inline />
              </>
            )}
          </View>
        ) : (
          <Text>Loading...</Text>
        )}
      </Modal>
    );
  }),
);

const Heading = (props: {icon: string; title: string}) => {
  return (
    <View style={styles.headingContainer}>
      <Icon name={props.icon} color={Colors.primaryColor} />
      <Text style={styles.headingTitle}>{props.title}</Text>
    </View>
  );
};

function BannerArea(props: {user: RawUser | User}) {
  return (
    <View style={styles.bannerOuterContainer}>
      <Banner margin={0} user={props.user!}>
        <View style={styles.bannerContainer}>
          <Avatar user={props.user!} size={80} />
          <View style={styles.bannerDetails}>
            <Text style={styles.usernameAndTag}>
              {props.user?.username}
              <Text style={styles.userTag}>:{props.user?.tag}</Text>
            </Text>
            <UserPresence showOffline userId={props.user.id} animate />
          </View>
        </View>
      </Banner>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    minHeight: 300,
  },
  bannerOuterContainer: {
    marginBottom: 60,
  },
  bannerContainer: {
    marginTop: 'auto',
    marginBottom: -60,
    marginLeft: 14,
    flexDirection: 'row',
  },
  bannerDetails: {
    marginTop: 20,
    marginLeft: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  usernameAndTag: {
    fontSize: 16,
  },
  userTag: {color: 'rgba(255,255,255,0.4)'},
  headingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
