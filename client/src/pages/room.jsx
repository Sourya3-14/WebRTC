import React from "react";
import ReactPlayer from "react-player";
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
  const [pendingCall, setPendingCall] = useState(null);

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

  useEffect(() => {
    peer.addEventListener("icecandidate", handleIceCandidate);

    return () => {
      peer.removeEventListener("icecandidate", handleIceCandidate);
    };
  }, [peer, handleIceCandidate]);

  const handleIncomingIce = useCallback(
    async ({ candidate }) => {
      await addIceCandidate(candidate);
    },
    [addIceCandidate],
  );

  useEffect(() => {
    socket.on("ice_candidate", handleIncomingIce);

    return () => {
      socket.off("ice_candidate", handleIncomingIce);
    };
  }, [socket, handleIncomingIce]);

  const handleNewUSerJoin = useCallback(
    async (data) => {
      const { emailId } = data; // 2nd persons email id

      sendStream(myStream);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const offer = await createOffer(); // creates your sdp offer and sets it as local description

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

      if (!myStream) {
        console.log("Waiting for local stream...", myStream);
        getUserMediaStream();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // console.log("Exited loop. myStream:", myStream);
      sendStream(myStream);

      const ans = await createAnswere(offer); // creates the sdp based on the received sdp and sets remote and local description
      //sends event only to the signalling server
      socket.emit("call_accepted", {
        emailId: from,
        ans,
      });
      // setPendingCall({ from, offer });

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

  useEffect(() => {
    if (!pendingCall || !myStream) return;

    const answerCall = async () => {
      sendStream(myStream);

      const ans = await createAnswere(pendingCall.offer);

      socket.emit("call_accepted", {
        emailId: pendingCall.from,
        ans,
      });

      setRemoteEmailId(pendingCall.from);
      setPendingCall(null);
    };

    answerCall();
  }, [pendingCall, myStream, sendStream, createAnswere, socket]);

  useEffect(() => {
    socket.on("user_joined", handleNewUSerJoin);
    socket.on("incomming_call", handleIncomingCall);
    socket.on("call_accepted", handleAcceptedCall);

    return () => {
      socket.off("user_joined", handleNewUSerJoin);
      socket.off("incomming_call", handleIncomingCall);
      socket.off("call_accepted", handleAcceptedCall);
    };
  }, [handleAcceptedCall, handleIncomingCall, handleNewUSerJoin, socket]);

  const getUserMediaStream = useCallback(async () => {
    console.log("Requesting media...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    console.log("Got stream:", stream);
    await setMyStream(stream);
  }, [setMyStream]);

  useEffect(() => {
    console.log("myStream changed:", myStream);
  }, [myStream]);

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
    peer.oniceconnectionstatechange = () => {
      console.log("ICE:", peer.iceConnectionState);
    };
  }, [peer]);

  useEffect(() => {
    console.log("Remote stream:", remoteStream);
  }, [remoteStream]);

  const handleNegotiation = async () => {
    const offer = await createOffer();

    socket.emit("peer_nego_needed", {
      offer,
      emailId: remoteEmailId,
    });
  };

  const handleNegoIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await createAnswere(offer);

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

  useEffect(() => {
    socket.on("peer_nego_needed", handleNegoIncoming);
    socket.on("peer_nego_final", handleNegoFinal);

    return () => {
      socket.off("peer_nego_needed", handleNegoIncoming);
      socket.off("peer_nego_final", handleNegoFinal);
    };
  }, [socket, handleNegoIncoming, handleNegoFinal]);

  useEffect(() => {
    peer.addEventListener("negotiationneeded", handleNegotiation);

    return () => {
      peer.removeEventListener("negotiationneeded", handleNegotiation);
    };
  }, [peer, handleNegotiation]);

  // after redirection check is both data available else resend the join_room event for safety
  useEffect(() => {
    const emailId = localStorage.getItem("emailId");

    if (!emailId || !roomId) return;

    socket.emit("join_room", {
      roomId,
      emailId,
    });
  }, [socket, roomId]);

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
