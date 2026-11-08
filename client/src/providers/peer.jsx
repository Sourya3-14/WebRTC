import React, { useMemo, useEffect, useRef, useState } from "react";
import { useCallback } from "react";

const PeerContext = React.createContext(null);

export const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = (props) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const pendingIceCandidates = useRef([]);

  //creates stun server requests
  const peer = useMemo(
    () =>
      new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      }),
    [],
  );

  const applyPendingIceCandidates = useCallback(async () => {
    const candidates = pendingIceCandidates.current;
    pendingIceCandidates.current = [];

    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }, [peer]);

  const createOffer = useCallback(async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, [peer]);

  const createAnswere = useCallback(async (offer) => {
    console.log("Before setRemoteDescription:", peer.signalingState);
    console.log("Offer type:", offer.type);

    await peer.setRemoteDescription(offer);
    await applyPendingIceCandidates();

    console.log("After setRemoteDescription:", peer.signalingState);

    const answer = await peer.createAnswer();

    console.log("Created answer");

    await peer.setLocalDescription(answer);

    console.log("After setLocalDescription:", peer.signalingState);

    return answer;
  }, [peer, applyPendingIceCandidates]);

  const setRemoteAnswer = useCallback(async (ans) => {
    await peer.setRemoteDescription(ans);
    await applyPendingIceCandidates();
  }, [peer, applyPendingIceCandidates]);

  const sendStream = useCallback(
    (stream) => {
      if (!stream) return;

      stream.getTracks().forEach((track) => {
        const alreadySending = peer
          .getSenders()
          .some((sender) => sender.track === track);

        if (!alreadySending) {
          peer.addTrack(track, stream);
        }
      });
    },
    [peer],
  );

  const addIceCandidate = useCallback(async (candidate) => {
    if (!candidate) return;

    if (!peer.remoteDescription) {
      pendingIceCandidates.current.push(candidate);
      return;
    }

    await peer.addIceCandidate(candidate);
  }, [peer]);

  const handleTracakEvent = useCallback((ev) => {
    console.log("TRACK EVENT", ev);
    console.log("Streams:", ev.streams);

    setRemoteStream(ev.streams[0]);
  }, []);

  useEffect(() => {
    peer.addEventListener("track", handleTracakEvent);
    return () => {
      peer.removeEventListener("track", handleTracakEvent);
    };
  }, [handleTracakEvent, peer]);

  return (
    <PeerContext.Provider
      value={{
        peer,
        createOffer,
        createAnswere,
        setRemoteAnswer,
        sendStream,
        remoteStream,
        addIceCandidate,
      }}
    >
      {props.children}
    </PeerContext.Provider>
  );
};
