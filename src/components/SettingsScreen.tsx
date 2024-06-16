import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Avatar from './ui/Avatar';
import Header from './ui/Header';
import {useStore} from '../store/store';
import Colors from './ui/Colors';
import Banner from './ui/Banner';
import CustomPressable from './ui/CustomPressable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import env from '../utils/env';
import {Dropdown} from './Dropdown';
import {UserStatuses, userStatusDetail} from '../utils/userStatus';
import {observer} from 'mobx-react-lite';
import {updatePresence} from '../services/UserService';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AccountSettings from './SettingsAccountScreen';

export type SettingsStackParamList = {
  default: undefined;
  account: undefined;
};

export type SettingsNavigationProp = NavigationProp<SettingsStackParamList>;

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsScreen() {
  return (
    <Stack.Navigator
      initialRouteName="default"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="default" component={DefaultSettings} />
      <Stack.Screen name="account" component={AccountSettings} />
    </Stack.Navigator>
  );
}

const DefaultSettings = () => {
  const store = useStore();
  const nav = useNavigation<SettingsNavigationProp>();
  const logoutClick = async () => {
    await store.logout();
    nav.getParent()?.dispatch(StackActions.replace('Splash'));
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.pageContainerInner}>
        <Header title="Settings" />
        <BannerArea />
        <View style={{marginTop: 60, margin: 10}}>
          <PresenceDropdown />

          <View style={styles.settingItems}>
            <SettingPressable
              onPress={() => nav.navigate('account')}
              label="Account Settings"
              icon="account-circle"
            />

            <View style={styles.divider} />

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
    </View>
  );
};

export function BannerArea() {
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
        <Icon
          color={props.color || Colors.primaryColor}
          size={16}
          name={props.icon}
        />
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
  divider: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  settingItems: {
    gap: 2,
    marginTop: 8,
  },
});
