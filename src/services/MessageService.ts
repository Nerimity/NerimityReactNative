import {RawAttachment, RawMessage} from '../store/RawData';
import env from '../utils/env';
import {request} from './Request';
import Endpoints from './ServiceEndpoints';

export const fetchMessages = async (
  channelId: string,
  limit = 50,
  afterMessageId?: string,
  beforeMessageId?: string,
) => {
  const data = await request<RawMessage[]>({
    method: 'GET',
    url: env.SERVER_URL + '/api' + Endpoints.messages(channelId),
    params: {
      limit,
      ...(afterMessageId ? {after: afterMessageId} : undefined),
      ...(beforeMessageId ? {before: beforeMessageId} : undefined),
    },
    useToken: true,
  });
  return data;
};

export const fetchChannelAttachments = async (
  channelId: string,
  limit = 50,
  afterAttachmentId?: string,
  beforeAttachmentId?: string,
) => {
  const data = await request<RawAttachment[]>({
    method: 'GET',
    url: env.SERVER_URL + '/api' + Endpoints.channelAttachments(channelId),
    params: {
      limit,
      ...(afterAttachmentId ? {after: afterAttachmentId} : undefined),
      ...(beforeAttachmentId ? {before: beforeAttachmentId} : undefined),
    },
    useToken: true,
  });
  return data;
};

interface PostMessageOpts {
  content?: string;
  channelId: string;
  socketId?: string;
  // attachment?: File;
}

export const postMessage = async (opts: PostMessageOpts) => {
  let body: any = {
    content: opts.content,
    ...(opts.socketId ? {socketId: opts.socketId} : {}),
  };

  // if (opts.attachment) {
  //   const fd = new FormData();
  //   opts.content && fd.append('content', opts.content);
  //   if (opts.socketId) {
  //     fd.append('socketId', opts.socketId);
  //   }
  //   fd.append('attachment', opts.attachment);
  //   body = fd;
  // }

  const data = await request<RawMessage>({
    method: 'POST',
    url: env.SERVER_URL + '/api' + Endpoints.messages(opts.channelId),
    useToken: true,
    body,
  });
  return data;
};

interface UpdateMessageOpts {
  content: string;
  channelId: string;
  messageId: string;
}

export const updateMessage = async (opts: UpdateMessageOpts) => {
  const data = await request<Partial<{updated: RawMessage}>>({
    method: 'PATCH',
    url:
      env.SERVER_URL +
      '/api' +
      Endpoints.message(opts.channelId, opts.messageId),
    useToken: true,
    body: {
      content: opts.content,
    },
  });
  return data;
};

export const postChannelTyping = async (channelId: string) => {
  const data = await request<RawMessage>({
    method: 'POST',
    url: env.SERVER_URL + '/api' + Endpoints.channelTyping(channelId),
    useToken: true,
    notJSON: true,
  });
  return data;
};

interface DeleteMessageOpts {
  channelId: string;
  messageId: string;
}

export const deleteMessage = async (opts: DeleteMessageOpts) => {
  const data = await request<{message: string}>({
    method: 'DELETE',
    url:
      env.SERVER_URL +
      '/api' +
      Endpoints.message(opts.channelId, opts.messageId),
    useToken: true,
  });
  return data;
};
export const addMessageReaction = async (opts: {
  channelId: string;
  messageId: string;
  name: string;
  emojiId?: string;
  gif?: boolean;
}) => {
  const data = await request<any>({
    method: 'POST',
    url:
      env.SERVER_URL +
      '/api' +
      Endpoints.message(opts.channelId, opts.messageId) +
      '/reactions',
    body: {
      name: opts.name,
      emojiId: opts.emojiId,
      gif: opts.gif,
    },
    useToken: true,
  });
  return data;
};
export const removeMessageReaction = async (opts: {
  channelId: string;
  messageId: string;
  name: string;
  emojiId?: string;
}) => {
  const data = await request<any>({
    method: 'POST',
    url:
      env.SERVER_URL +
      '/api' +
      Endpoints.message(opts.channelId, opts.messageId) +
      '/reactions/remove',
    body: {
      name: opts.name,
      emojiId: opts.emojiId,
    },
    useToken: true,
  });
  return data;
};
