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

  const [myStream, setMyStream] = useState(null);
  const [remoteEmailId, setRemoteEmailId] = useState();

  const handleIceCandidate = useCallback(
    (event) => {
      if (event.candidate && remoteEmailId) {
        socket.emit("ice_candidate", {
          emailId: remoteEmailId,
          candidate: event.candidate,
        });
      }
    },
    [socket, remoteEmailId],
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

      // must be included here
      if (!myStream) {
        console.log("Waiting for local stream...", myStream);
        getUserMediaStream();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      sendStream(myStream);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // creates your sdp offer and sets it as local description
      const offer = await createOffer();

      socket.emit("call_user", {
        emailId,
        offer,
      });

      setRemoteEmailId(emailId);
    },
    [socket, createOffer, sendStream, myStream],
  );

  const handleIncomingCall = useCallback(
    async (data) => {
      console.log("Incoming call received");
      console.log("myStream at callback start:", myStream);

      const { from, offer } = data;

      // must be included here too
      if (!myStream) {
        console.log("Waiting for local stream...", myStream);
        getUserMediaStream();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      sendStream(myStream);

      // creates the sdp based on the received sdp and sets remote and local description
      const ans = await createAnswere(offer);

      //sends event only to the signalling server
      socket.emit("call_accepted", {
        emailId: from,
        ans,
      });

      setRemoteEmailId(from);
    },
    [socket, createAnswere, sendStream, myStream],
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

  const getUserMediaStream = useCallback(async () => {
    console.log("Requesting media...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    console.log("Got stream:", stream);
    await setMyStream(stream);
  }, [setMyStream]);

  const handleNegotiation = async () => {
    const offer = await createOffer();

    // must be included here too
    if (!myStream) {
      console.log("Waiting for local stream...", myStream);
      getUserMediaStream();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    sendStream(myStream);

    socket.emit("peer_nego_needed", {
      offer,
      emailId: remoteEmailId,
    });
  };

  const handleNegoIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await createAnswere(offer);

      // must be included here too
      if (!myStream) {
        console.log("Waiting for local stream...", myStream);
        getUserMediaStream();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      sendStream(myStream);

      socket.emit("peer_nego_done", {
        emailId: from,
        ans,
      });
    },
    [createAnswere, socket],
  );

  const handleNegoFinal = useCallback(
    async ({ ans }) => {
      await setRemoteAnswer(ans);
    },
    [setRemoteAnswer],
  );

  // after redirection check is both data available else resend the join_room event for safety
  useEffect(() => {
    const emailId = localStorage.getItem("emailId");

    if (!emailId || !roomId) return;

    socket.emit("join_room", {
      roomId,
      emailId,
    });
  }, [socket, roomId]);

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
    socket.on("user_joined", handleNewUSerJoin);
    socket.on("incomming_call", handleIncomingCall);
    socket.on("call_accepted", handleAcceptedCall);
    socket.on("ice_candidate", handleIncomingIce);
    socket.on("peer_nego_needed", handleNegoIncoming);
    socket.on("peer_nego_final", handleNegoFinal);

    return () => {
      socket.off("user_joined", handleNewUSerJoin);
      socket.off("incomming_call", handleIncomingCall);
      socket.off("call_accepted", handleAcceptedCall);
      socket.off("ice_candidate", handleIncomingIce);
      socket.off("peer_nego_needed", handleNegoIncoming);
      socket.off("peer_nego_final", handleNegoFinal);
    };
  }, [
    handleNegoFinal,
    handleNegoIncoming,
    handleIncomingIce,
    handleAcceptedCall,
    handleIncomingCall,
    handleNewUSerJoin,
    socket,
  ]);

  useEffect(() => {
    peer.addEventListener("icecandidate", handleIceCandidate);
    peer.addEventListener("negotiationneeded", handleNegotiation);

    peer.oniceconnectionstatechange = () => {
      console.log("ICE:", peer.iceConnectionState);
    };

    return () => {
      peer.removeEventListener("icecandidate", handleIceCandidate);
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, handleIceCandidate, handleNegotiation]);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-bold">
        Room Page you are connected to : {remoteEmailId}
      </h1>

      <div className="flex gap-8">
        <div>
          <h2 className="text-center mb-2 font-semibold">My Video</h2>
          <video
            ref={myVideoRef}
            autoPlay
            playsInline
            muted
            className="w-96 rounded-lg border"
          />
        </div>

        <div>
          <h2 className="text-center mb-2 font-semibold">Remote Video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-96 rounded-lg border"
          />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
