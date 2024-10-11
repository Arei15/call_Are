import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import { Video, Phone, PhoneOff } from 'lucide-react';

// Use environment variable for signaling server URL
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'https://your-signaling-server.com';
const socket = io(SIGNALING_SERVER);

function App() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [inCall, setInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((error) => console.error('Error accessing media devices:', error));

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleNewICECandidate);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleNewICECandidate);
    };
  }, []);

  const createPeer = (initiator: boolean) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStream!,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Remove hardcoded TURN server credentials
          // Add your own TURN server configuration here
        ]
      }
    });

    peer.on('signal', (data) => {
      socket.emit('signal', JSON.stringify(data));
    });

    peer.on('stream', (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return peer;
  };

  const handleOffer = (offer: string) => {
    peerRef.current = createPeer(false);
    peerRef.current.signal(JSON.parse(offer));
  };

  const handleAnswer = (answer: string) => {
    peerRef.current?.signal(JSON.parse(answer));
  };

  const handleNewICECandidate = (candidate: string) => {
    peerRef.current?.signal(JSON.parse(candidate));
  };

  const startCall = () => {
    peerRef.current = createPeer(true);
    setInCall(true);
  };

  const endCall = () => {
    peerRef.current?.destroy();
    setInCall(false);
    setRemoteStream(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">WebRTC Video Call</h1>
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-80 h-60 bg-black rounded-lg"
          />
          <p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">You</p>
        </div>
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-80 h-60 bg-black rounded-lg"
          />
          <p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">Remote</p>
        </div>
      </div>
      <div className="flex gap-4">
        {!inCall ? (
          <button
            onClick={startCall}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <Phone className="mr-2" /> Start Call
          </button>
        ) : (
          <button
            onClick={endCall}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <PhoneOff className="mr-2" /> End Call
          </button>
        )}
      </div>
    </div>
  );
}

export default App;