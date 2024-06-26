import {
  RawChannel,
  RawInboxWithoutChannel,
  RawPost,
  RawUser,
} from '../store/RawData';
import {Presence} from '../store/users';
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

export async function updatePresence(presence: Partial<Presence>) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.updatePresence(),
    method: 'POST',
    body: presence,
    useToken: true,
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

export interface UserDetails {
  user: RawUser & {
    _count: {
      followers: number;
      following: number;
      likedPosts: number;
      posts: number;
    };
    following: any[];
    followers: any[];
  };
  mutualFriendIds: string[];
  mutualServerIds: string[];
  latestPost: RawPost;
  profile?: UserProfile;
}
export interface UserProfile {
  bio?: string;
}

export async function fetchUser(userId: string) {
  return request<UserDetails>({
    url: env.SERVER_URL + '/api' + ServiceEndpoints.user(userId),
    method: 'GET',
    useToken: true,
  });
}
