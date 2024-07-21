import env from '../env';
import {request} from './Request';
import ServiceEndpoints from './ServiceEndpoints';

interface UpdateUserOptions {
  email?: string;
  username?: string;
  avatar?: string;
  banner?: string;
  tag?: string;
  password?: string;
  newPassword?: string;
  bio?: string | null;
  socketId?: string;
  dmStatus?: number;
  friendRequestStatus?: number;
}
export async function updateUser(body: UpdateUserOptions) {
  return request<{user: any; newToken?: string}>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.user(''),
    method: 'POST',
    body,
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
