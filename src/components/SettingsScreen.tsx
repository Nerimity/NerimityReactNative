import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Avatar from './ui/Avatar';
import Header from './ui/Header';
import {useStore} from '../store/store';
import Colors from './ui/Colors';
import Banner from './ui/Banner';
import CustomPressable from './ui/CustomPressable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StackActions, useNavigation} from '@react-navigation/native';
import env from '../utils/env';
import {Dropdown, DropdownItem} from './Dropdown';
import {CustomPortalProvider} from '../utils/CustomPortal';
import {UserStatuses, userStatusDetail} from '../utils/userStatus';
import {observer} from 'mobx-react-lite';
import {updatePresence} from '../services/UserService';

export default function SettingsScreen() {
  const store = useStore();
  const nav = useNavigation();
  const logoutClick = async () => {
    await store.logout();
    nav.getParent()?.dispatch(StackActions.replace('Splash'));
  };

  return (
    <CustomPortalProvider>
      <View style={styles.pageContainer}>
        <View style={styles.pageContainerInner}>
          <Header title="Settings" />
          <BannerArea />
          <View style={{marginTop: 60, margin: 10}}>
            <PresenceDropdown />
            <SettingPressable
              onPress={logoutClick}
              label="Logout"
              color={Colors.alertColor}
              icon="logout"
            />
            <SettingPressable
              label={`App version: ${env.APP_VERSION || 'Unknown'}`}
              icon="info"
            />
          </View>
        </View>
      </View>
    </CustomPortalProvider>
  );
}

function BannerArea() {
  const {account} = useStore();
  return (
    <Banner user={account.user!}>
      <View style={styles.bannerContainer}>
        <Avatar user={account.user!} size={80} />
        <Text style={styles.usernameAndTag}>
          {account.user?.username}
          <Text style={styles.userTag}>:{account.user?.tag}</Text>
        </Text>
      </View>
    </Banner>
  );
}

const PresenceDropdown = observer(() => {
  const {account, users} = useStore();

  const user = users.get(account.user?.id!);
  const status = userStatusDetail(user?.presence?.status || 0);

  const dropDownItems = UserStatuses.map((item, i) => {
    return {
      circleColor: item.color,
      id: item.id,
      label: item.name === 'Offline' ? 'Appear As Offline' : item.name,
      onClick: () => {
        updatePresence({
          status: i,
        });
      },
    };
  });

  // move invisible to the bottom.
  dropDownItems.push(dropDownItems.shift()!);

  console.log(dropDownItems, status.id);

  return (
    <Dropdown title="Presence" items={dropDownItems} selectedId={status.id} />
  );
});

function SettingPressable(props: {
  onPress?(): void;
  label: string;
  icon: string;
  color?: string;
}) {
  return (
    <CustomPressable onPress={props.onPress}>
      <View style={styles.settingPressableContainer}>
        <Icon color={props.color || Colors.primaryColor} name={props.icon} />
        <Text>{props.label}</Text>
      </View>
    </CustomPressable>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.backgroundColor,
    flexDirection: 'column',
    flex: 1,
  },
  pageContainerInner: {
    backgroundColor: Colors.paneColor,

    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerContainer: {marginTop: 'auto', marginBottom: -60, marginLeft: 15},
  usernameAndTag: {
    marginTop: 5,
    marginLeft: -10,
    fontSize: 16,
  },
  userTag: {color: 'rgba(255,255,255,0.4)'},
  settingPressableContainer: {
    alignSelf: 'flex-start',
    padding: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
