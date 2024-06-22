import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import Header from './ui/Header';
import Colors from './ui/Colors';
import {BannerArea} from './SettingsScreen';
import SettingsBlock from './ui/SettingsBlock';
import CustomInput from './ui/CustomInput';
import {useStore} from '../store/store';
import Show from './ui/Show';
import CustomButton from './ui/CustomButton';
import {useUpdatedSignal} from './common/createUpdatedSignal';
import {updateUser} from '../services/UserService';
import {storeUserToken} from '../utils/EncryptedStore';

const AccountSettings = () => {
  const store = useStore();

  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const defaultInput = useMemo(
    () => ({
      email: store.account.user?.email || '',
      tag: store.account.user?.tag || '',
      username: store.account.user?.username || '',
      password: '',
    }),
    [store.account.user],
  );

  const [inputValues, updatedInputValues, setInputValue] =
    useUpdatedSignal(defaultInput);

  const hasUpdatedValues = () => {
    return Object.keys(updatedInputValues()).length;
  };

  const saveChanges = async () => {
    if (requestSent) {
      return;
    }
    setRequestSent(true);
    setError(null);

    const values = {
      ...updatedInputValues(),
      socketId: store.socket.io.id,
      confirmNewPassword: undefined,
    };

    await updateUser(values)
      .then(res => {
        if (res.newToken) {
          store.account.setToken(res.newToken);
          storeUserToken(res.newToken);
        }
        // if (values.email && values.email !== account.user()?.email) {
        //   // account.setUser({emailConfirmed: false});
        // }

        setInputValue('password', '');
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setRequestSent(false));
  };
  return (
    <View style={styles.pageContainer}>
      <Header title="Account Settings" showGoBack />
      <ScrollView style={styles.pageContainerInner}>
        <BannerArea />
        <View style={{marginTop: 60, margin: 10, gap: 8}}>
          <InputBlock
            icon="mail"
            title="Email"
            value={inputValues.email}
            onText={t => setInputValue('email', t)}
          />
          <InputBlock
            icon="face"
            title="Username"
            value={inputValues.username}
            onText={t => setInputValue('username', t)}
          />
          <InputBlock
            icon="local-offer"
            title="Tag"
            value={inputValues.tag}
            onText={t => setInputValue('tag', t)}
          />

          <Show when={hasUpdatedValues()}>
            <>
              <InputBlock
                icon="lock"
                title="Confirm Password"
                secure
                value={inputValues.password}
                onText={t => setInputValue('password', t)}
              />
              <Show when={error}>
                <Text style={{color: Colors.alertColor}}>{error}</Text>
              </Show>
              <CustomButton
                onPress={saveChanges}
                title={requestSent ? 'Saving...' : 'Save Changes'}
                icon="save"
                margin={0}
              />
            </>
          </Show>
        </View>
      </ScrollView>
    </View>
  );
};

const InputBlock = (props: {
  icon: string;
  title: string;
  value?: string;
  onText?: (text: string) => void;
  secure?: boolean;
  description?: string;
}) => {
  return (
    <SettingsBlock
      label={props.title}
      icon={props.icon}
      description={props.description}>
      <CustomInput
        returnKeyType="done"
        value={props.value}
        secure={props.secure}
        onText={props.onText}
      />
    </SettingsBlock>
  );
};

export default AccountSettings;

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: Colors.paneColor,
    flexDirection: 'column',
    flex: 1,
  },
  pageContainerInner: {
    flex: 1,
    margin: 2,
    overflow: 'hidden',
  },
});
