import React, { useMemo, useEffect, useState } from "react";
import { useCallback } from "react";
import { useDeferredValue } from "react";

const PeerContext = React.createContext(null);

export const usePeer = () => React.useContext(PeerContext);

export const PeerProvider = (props) => {
  const [remoteStream, setRemoteStream] = useState(null);

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

  const createOffer = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  };

  const createAnswere = async (offer) => {
    console.log("Before setRemoteDescription:", peer.signalingState);
    console.log("Offer type:", offer.type);

    await peer.setRemoteDescription(offer);

    console.log("After setRemoteDescription:", peer.signalingState);

    const answer = await peer.createAnswer();

    console.log("Created answer");

    await peer.setLocalDescription(answer);

    console.log("After setLocalDescription:", peer.signalingState);

    return answer;
  };

  const setRemoteAnswer = async (ans) => {
    await peer.setRemoteDescription(ans);
  };

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

  const addIceCandidate = async (candidate) => {
    if (!candidate) return;

    try {
      await peer.addIceCandidate(candidate);
      console.log("ICE candidate added");
    } catch (err) {
      console.error(err);
    }
  };

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

  // useEffect(()=>{
  //   peer.onicecandidate = (event) => {
  //     if (event.candidate) {
  //       console.log("ICE candidate:", event.candidate);
  //     }
  //   };
  // }, [peer]);

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
