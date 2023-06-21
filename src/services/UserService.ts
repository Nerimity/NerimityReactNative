import {RawChannel, RawInboxWithoutChannel} from '../store/RawData';
import env from '../utils/env';
import {request} from './Request';
import ServiceEndpoints from './ServiceEndpoints';

export async function loginRequest(
  email: string,
  password: string,
): Promise<{token: string}> {
  const isUsernameAndTag = email.includes(':');
  return request({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.login(),
    method: 'POST',
    body: {
      ...(isUsernameAndTag ? {usernameAndTag: email} : {email}),
      password,
    },
  });
}

export async function openDMChannelRequest(userId: string) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.openUserDM(userId),
    method: 'POST',
    useToken: true,
  });
}

export async function registerFCM(token: string) {
  return request<undefined>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.user('register-fcm'),
    body: {token},
    method: 'POST',
    useToken: true,
    notJSON: true,
  });
}
