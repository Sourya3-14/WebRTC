import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../providers/socket.jsx";
import { usePeer } from "../providers/peer.jsx";

const RoomPage = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();

  const {
    peer,
    createOffer,
    createAnswere,
    setRemoteAnswer,
    sendStream,
    remoteStream,
    addIceCandidate,
  } = usePeer();

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingStreamRef = useRef(null);
  const remoteEmailIdRef = useRef();

  const [myStream, setMyStream] = useState(null);
  const [remoteEmailId, setRemoteEmailId] = useState();

  const getUserMediaStream = useCallback(() => {
    if (localStreamRef.current) {
      return Promise.resolve(localStreamRef.current);
    }

    if (!pendingStreamRef.current) {
      console.log("Requesting media...");
      pendingStreamRef.current = navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((stream) => {
          localStreamRef.current = stream;
          setMyStream(stream);
          console.log("Got stream:", stream);
          return stream;
        })
        .finally(() => {
          pendingStreamRef.current = null;
        });
    }

    return pendingStreamRef.current;
  }, []);

  const handleIceCandidate = useCallback(
    (event) => {
      if (event.candidate && remoteEmailIdRef.current) {
        socket.emit("ice_candidate", {
          emailId: remoteEmailIdRef.current,
          candidate: event.candidate,
        });
      }
    },
    [socket],
  );

  const handleIncomingIce = useCallback(
    async ({ candidate }) => {
      await addIceCandidate(candidate);
    },
    [addIceCandidate],
  );

  const handleNewUSerJoin = useCallback(
    async (data) => {
      const { emailId } = data; // 2nd persons email id

      remoteEmailIdRef.current = emailId;
      setRemoteEmailId(emailId);

      const stream = await getUserMediaStream();
      sendStream(stream);

      const offer = await createOffer();

      socket.emit("call_user", {
        emailId,
        offer,
      });
    },
    [socket, createOffer, sendStream, getUserMediaStream],
  );

  const handleIncomingCall = useCallback(
    async (data) => {
      const { from, offer } = data;

      remoteEmailIdRef.current = from;
      setRemoteEmailId(from);

      const stream = await getUserMediaStream();
      sendStream(stream);

      // creates the sdp based on the received sdp and sets remote and local description
      const ans = await createAnswere(offer);

      //sends event only to the signalling server
      socket.emit("call_accepted", {
        emailId: from,
        ans,
      });
    },
    [socket, createAnswere, sendStream, getUserMediaStream],
  );

  const handleAcceptedCall = useCallback(
    async (data) => {
      console.log("CALL ACCEPTED EVENT RECEIVED");
      const { ans } = data;
      console.log("call got accepted", ans);
      await setRemoteAnswer(ans); // sets remote description for the sender
    },
    [setRemoteAnswer],
  );

  useEffect(() => {
    const emailId = localStorage.getItem("emailId");

    if (!emailId || !roomId) return;

    const joinRoom = () => {
      socket.emit("join_room", { roomId, emailId });
    };

    socket.on("user_joined", handleNewUSerJoin);
    socket.on("incomming_call", handleIncomingCall);
    socket.on("call_accepted", handleAcceptedCall);
    socket.on("ice_candidate", handleIncomingIce);
    socket.on("connect", joinRoom);
    if (socket.connected) joinRoom();

    return () => {
      socket.off("user_joined", handleNewUSerJoin);
      socket.off("incomming_call", handleIncomingCall);
      socket.off("call_accepted", handleAcceptedCall);
      socket.off("ice_candidate", handleIncomingIce);
      socket.off("connect", joinRoom);
    };
  }, [
    socket,
    roomId,
    handleNewUSerJoin,
    handleIncomingCall,
    handleAcceptedCall,
    handleIncomingIce,
  ]);

  useEffect(() => {
    getUserMediaStream();
  }, [getUserMediaStream]);

  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    peer.addEventListener("icecandidate", handleIceCandidate);

    peer.oniceconnectionstatechange = () => {
      console.log("ICE:", peer.iceConnectionState);
    };

    return () => {
      peer.removeEventListener("icecandidate", handleIceCandidate);
    };
  }, [peer, handleIceCandidate]);

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">
        Room Page you are connected to : {remoteEmailId}
      </h1>

      <div className="relative w-[900px] h-[520px] rounded-xl overflow-hidden border bg-black">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* My Video */}
        <video
          ref={myVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 w-56 h-40 object-cover rounded-lg border-2 border-white shadow-lg bg-black"
        />
      </div>
    </div>
  );
};

export default RoomPage;
