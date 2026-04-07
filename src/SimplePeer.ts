import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';

export type RTCConfiguration = {
  iceServers?: Array<{
    urls?: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceTransportPolicy?: 'all' | 'relay';
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
};

export type RTCIceCandidateInit = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

export type RTCSessionDescriptionInit = {
  type: 'offer' | 'answer';
  sdp: string;
};

export type RTCIceCandidateWrapper = {
  candidate: RTCIceCandidateInit;
};

export type SimplePeerSignalData =
  | RTCSessionDescriptionInit
  | RTCIceCandidateWrapper;

export type RTCDataChannel = any;

export type SimplePeerOptions = {
  initiator?: boolean;
  trickle?: boolean;
  config?: RTCConfiguration;
  stream?: MediaStream;
};

export type SimplePeerEvents =
  | 'signal'
  | 'connect'
  | 'data'
  | 'stream'
  | 'close'
  | 'error';

export class SimplePeer {
  public pc: RTCPeerConnection;
  public channel?: RTCDataChannel;
  private initiator: boolean;
  private trickle: boolean;
  private destroyed = false;
  private connected = false;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();
  private onceListeners = new Map<string, Set<(...args: any[]) => void>>();
  private pendingIce: RTCIceCandidateWrapper[] = [];
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];
  private waitingForRemoteDescription = true;

  constructor(options: SimplePeerOptions = {}) {
    this.initiator = !!options.initiator;
    this.trickle = options.trickle !== false;

    const config: RTCConfiguration = options.config ?? {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    this.pc = new RTCPeerConnection(config);
    this.bindPeerConnectionEvents();

    if (options.stream) {
      this.addStream(options.stream);
    }

    if (this.initiator) {
      this.createOffer();
    }
  }

  public on(event: SimplePeerEvents, listener: (...args: any[]) => void): this {
    const existing = this.listeners.get(event) ?? new Set();
    existing.add(listener);
    this.listeners.set(event, existing);
    return this;
  }

  public once(
    event: SimplePeerEvents,
    listener: (...args: any[]) => void,
  ): this {
    const existing = this.onceListeners.get(event) ?? new Set();
    existing.add(listener);
    this.onceListeners.set(event, existing);
    return this;
  }

  public off(
    event: SimplePeerEvents,
    listener: (...args: any[]) => void,
  ): this {
    this.listeners.get(event)?.delete(listener);
    this.onceListeners.get(event)?.delete(listener);
    return this;
  }

  public signal(data: SimplePeerSignalData | string): this {
    const signalData: SimplePeerSignalData =
      typeof data === 'string'
        ? (JSON.parse(data) as SimplePeerSignalData)
        : data;

    if ('candidate' in signalData) {
      const candidateData = (signalData as any).candidate || signalData;
      // Skip invalid candidates where both sdpMLineIndex and sdpMid are null
      if (candidateData.sdpMLineIndex == null && candidateData.sdpMid == null) {
        console.log('Skipping invalid candidate', signalData);
        return this;
      }
      if (this.waitingForRemoteDescription) {
        this.pendingRemoteCandidates.push(candidateData);
      } else {
        try {
          const candidate = new RTCIceCandidate(candidateData);
          this.pc
            .addIceCandidate(candidate)
            .catch((error: any) => this.emit('error', error));
        } catch (error) {
          this.emit('error', error);
        }
      }
      return this;
    }

    const description: RTCSessionDescriptionInit = signalData;

    this.pc
      .setRemoteDescription(new RTCSessionDescription(description))
      .then(() => {
        this.waitingForRemoteDescription = false;
        this.flushPendingRemoteCandidates();

        if (description.type === 'offer' && !this.initiator) {
          this.createAnswer();
        }
      })
      .catch(error => this.emit('error', error));

    return this;
  }

  public send(data: string | ArrayBuffer | Blob): this {
    if (!this.channel) {
      this.emit('error', new Error('Data channel is not established'));
      return this;
    }

    try {
      this.channel.send(data as any);
    } catch (error) {
      this.emit('error', error);
    }

    return this;
  }

  public addStream(stream: MediaStream): this {
    if (this.destroyed) {
      return this;
    }

    stream.getTracks().forEach(track => {
      this.pc.addTrack(track, stream);
    });

    return this;
  }

  public destroy(): this {
    if (this.destroyed) {
      console.log('already destroyed');
      return this;
    }
    console.log('destroying peer');
    this.destroyed = true;
    this.connected = false;
    this.channel?.close();
    this.pc.close();
    this.emit('close');
    return this;
  }

  private emit(event: SimplePeerEvents, ...args: any[]): void {
    this.listeners.get(event)?.forEach(listener => listener(...args));
    this.onceListeners.get(event)?.forEach(listener => listener(...args));
    this.onceListeners.delete(event);
  }

  private bindPeerConnectionEvents(): void {
    (this.pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        // Nest candidate under a 'candidate' key to match simple-peer's wire format
        const signalData: RTCIceCandidateWrapper = {
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        };

        if (this.trickle) {
          this.emit('signal', signalData);
        } else {
          this.pendingIce.push(signalData);
        }
      } else if (!this.trickle) {
        this.emitLocalDescription();
      }
    };

    (this.pc as any).oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        this.connected = true;
        this.emit('connect');
      }

      if (
        state === 'failed' ||
        state === 'disconnected' ||
        state === 'closed'
      ) {
        if (this.connected) {
          this.emit('close');
        }
      }
    };

    (this.pc as any).ontrack = (event: any) => {
      if (event.streams && event.streams.length > 0) {
        this.emit('stream', event.streams[0]);
      }
    };

    // Fallback for older react-native-webrtc versions.
    (this.pc as any).onaddstream = (event: any) => {
      if (event.stream) {
        this.emit('stream', event.stream);
      }
    };

    (this.pc as any).ondatachannel = (event: any) => {
      this.setupDataChannel(event.channel);
    };
  }

  private createOffer(): void {
    this.channel = this.pc.createDataChannel('simple-peer');
    this.setupDataChannel(this.channel);

    this.pc
      .createOffer()
      .then(offer => this.pc.setLocalDescription(offer))
      .then(() => {
        if (this.trickle) {
          this.emitLocalDescription();
        }
      })
      .catch(error => this.emit('error', error));
  }

  private createAnswer(): void {
    this.pc
      .createAnswer()
      .then((answer: any) => this.pc.setLocalDescription(answer))
      .then(() => {
        if (this.trickle) {
          this.emitLocalDescription();
        }
      })
      .catch((error: any) => this.emit('error', error));
  }

  private setupDataChannel(channel?: RTCDataChannel): void {
    if (!channel) {
      return;
    }

    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';

    this.channel.onopen = () => {
      this.connected = true;
      this.emit('connect');
    };

    this.channel.onmessage = (event: any) => {
      this.emit('data', event.data);
    };

    this.channel.onclose = () => {
      this.emit('close');
    };

    this.channel.onerror = (error: any) => {
      this.emit('error', error);
    };
  }

  private emitLocalDescription(): void {
    const localDescription = this.pc.localDescription;
    if (!localDescription) {
      return;
    }

    this.emit('signal', {
      type: localDescription.type as 'offer' | 'answer',
      sdp: localDescription.sdp ?? '',
    });

    if (!this.trickle) {
      this.pendingIce = [];
    }
  }

  private flushPendingRemoteCandidates(): void {
    this.pendingRemoteCandidates.forEach(candidate => {
      // Skip invalid candidates
      if (candidate.sdpMLineIndex == null && candidate.sdpMid == null) {
        console.log('Skipping invalid pending candidate', candidate);
        return;
      }
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        this.pc
          .addIceCandidate(iceCandidate)
          .catch(error => this.emit('error', error));
      } catch (error) {
        this.emit('error', error);
      }
    });
    this.pendingRemoteCandidates = [];
  }
}
