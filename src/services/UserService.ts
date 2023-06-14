import config from '../../config';
import {RawChannel, RawInboxWithoutChannel} from '../store/RawData';
import {request} from './Request';
import ServiceEndpoints from './ServiceEndpoints';

export async function loginRequest(
  email: string,
  password: string,
): Promise<{token: string}> {
  const isUsernameAndTag = email.includes(':');
  return request({
    url: config.serverUrl + '/api' + ServiceEndpoints.login(),
    method: 'POST',
    body: {
      ...(isUsernameAndTag ? {usernameAndTag: email} : {email}),
      password,
    },
  });
}

export async function openDMChannelRequest(userId: string) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url: config.serverUrl + '/api' + ServiceEndpoints.openUserDM(userId),
    method: 'POST',
    useToken: true,
  });
}
