import EncryptedStorage from 'react-native-encrypted-storage';

export async function storeUserToken(token: string) {
  await EncryptedStorage.setItem('user_token', token);
}

export async function getUserToken() {
  return await EncryptedStorage.getItem('user_token');
}
export async function removeUserToken() {
  return await EncryptedStorage.removeItem('user_token');
}

export async function storeLastUpdateCheckedDate() {
  await EncryptedStorage.setItem(
    'last_update_checked_date',
    Date.now().toString(),
  );
}

export async function getLastUpdateCheckedDate() {
  return parseInt(
    (await EncryptedStorage.getItem('last_update_checked_date')) || '0',
  );
}
