import {
  createContext,
  JSX,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { useSocket, useSocketListener } from './SocketProvider';
import { getUserId, getUserToken } from './EncryptedStore';
import { SimplePeer, SimplePeerSignalData } from './SimplePeer';
import inCallManager from 'react-native-incall-manager';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

type CallContextValue = {
  joinCall: (channelId: string) => Promise<void>;
  endCall: () => void;
  setVoiceUsers: (users: VoiceUser[]) => void;
  toggleSpeaker: () => void;
  voiceUsers: VoiceUser[];
  joinedChannelId: string | null;
};

interface UserJoinPayload {
  channelId: string;
  serverId: null | string;
  userId: string;
}

interface SignalPayload {
  signal: SimplePeerSignalData;
  fromUserId: string;
  channelId: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export interface VoiceUser {
  userId: string;
  channelId: string;
  serverId: null | string;
  peer?: SimplePeer;
  connected?: boolean;
}

export const CallProvider = (props: { children: JSX.Element }) => {
  const [joinedChannelId, setJoinedChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const peersRef = useRef<Map<string, SimplePeer>>(new Map());

  const { socket } = useSocket();

  const peerKey = (channelId: string, userId: string) =>
    `${channelId}:${userId}`;

  const micStreamRef = useRef<MediaStream | null>(null);

  const [isSpeaker, setIsSpeaker] = useState(false);

  const toggleSpeaker = () => {
    const next = !isSpeaker;
    inCallManager.setForceSpeakerphoneOn(next);
    setIsSpeaker(next);
  };

  const setVoiceChannelUser = (
    channelId: string,
    userId: string,
    voiceUser: VoiceUser,
  ) => {
    setVoiceUsers(prev => {
      const exists = prev.some(
        u => u.userId === userId && u.channelId === channelId,
      );
      if (exists) {
        return prev.map(u =>
          u.userId === userId && u.channelId === channelId ? voiceUser : u,
        );
      }
      return [...prev, voiceUser];
    });
  };

  useSocketListener(
    'voice:user_left',
    async (data: { channelId: string; userId: string }) => {
      if ((await getUserId()) === data.userId) {
        if (joinedChannelId === data.channelId) {
          leaveCall();
        }
      }

      const key = peerKey(data.channelId, data.userId);

      peersRef.current.get(key)?.destroy();
      peersRef.current.delete(key);
      setVoiceUsers(prev =>
        prev.filter(
          u => u.userId !== data.userId || u.channelId !== data.channelId,
        ),
      );
    },
  );

  useSocketListener('voice:user_joined', async (data: UserJoinPayload) => {
    setVoiceChannelUser(data.channelId, data.userId, data);

    if ((await getUserId()) === data.userId) return;
    if (joinedChannelId === data.channelId) {
      createPeer(data);
    }
  });

  const createPeer = (voiceUser: VoiceUser, signal?: SimplePeerSignalData) => {
    const key = peerKey(voiceUser.channelId, voiceUser.userId);
    const existingPeer = peersRef.current.get(key);

    console.log(micStreamRef.current);
    const peer =
      existingPeer ||
      new SimplePeer({
        trickle: true,
        initiator: !signal,
        stream: micStreamRef.current!,
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });
    if (!existingPeer) {
      peersRef.current.set(key, peer);

      setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
        ...voiceUser,
        peer,
      });

      peer.on('error', error => {
        console.error('Peer error:', error);
      });
      peer.on('connect', () => {
        console.log('CONNECTED');
        setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
          ...voiceUser,
          connected: true,
        });
      });
      peer.on('close', () => {
        console.log('CLOSED');
        if (!voiceUsers.find(v => v.peer === peer)) return;
        setVoiceChannelUser(voiceUser.channelId, voiceUser.userId, {
          ...voiceUser,
          connected: false,
        });
      });

      peer.on('signal', (newSignal: SimplePeerSignalData) => {
        socket?.emit('voice:signal_send', {
          channelId: voiceUser.channelId,
          toUserId: voiceUser.userId,
          signal: newSignal,
        });
        console.log('OWO EMITTT', newSignal);
      });
    }
    if (signal) {
      peer.signal(signal);
    }
  };

  useSocketListener('voice:signal_received', (data: SignalPayload) => {
    console.log('SIGNAL RECEIVED', data);

    const key = peerKey(data.channelId, data.fromUserId);
    const existingPeer = peersRef.current.get(key);

    const voiceUser = voiceUsers.find(
      u => u.userId === data.fromUserId && u.channelId === data.channelId,
    );

    if (existingPeer) {
      existingPeer.signal(data.signal);
      return;
    }
    if (voiceUser) {
      createPeer(voiceUser, data.signal);
    }
  });

  const joinCall = useCallback(
    async (channelId: string) => {
      leaveCall();
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      console.log(stream);
      micStreamRef.current = stream;
      inCallManager.start({ media: 'audio' });

      setIsSpeaker(false);
      inCallManager.setForceSpeakerphoneOn(false);
      const token = await getUserToken();
      fetch(`https://nerimity.com/api/channels/${channelId}/voice/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token || '',
        },
        body: JSON.stringify({
          socketId: socket?.id,
        }),
      }).then(res => {
        if (res.ok) {
          setJoinedChannelId(channelId);
        }
      });
    },
    [socket],
  );

  const endCall = useCallback(async () => {
    leaveCall();

    const token = await getUserToken();
    fetch(`https://nerimity.com/api/channels/${joinedChannelId}/voice/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token || '',
      },
      body: JSON.stringify({
        socketId: socket?.id,
      }),
    });
  }, [socket, joinedChannelId]);

  const leaveCall = () => {
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();

    setVoiceUsers(prev => {
      return prev.map(u => {
        return { ...u, connected: false, peer: undefined };
      });
    });
    setJoinedChannelId(null);
    inCallManager.stop();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  };

  const value = {
    joinCall,
    setVoiceUsers,
    voiceUsers,
    joinedChannelId,
    endCall,
    toggleSpeaker,
  } as CallContextValue;

  return (
    <CallContext.Provider value={value}>{props.children}</CallContext.Provider>
  );
};
export const useCall = () => {
  const call = useContext(CallContext);
  if (!call) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return call;
};
