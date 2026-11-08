import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../providers/socket.jsx";

const HomePage = () => {
  const { socket } = useSocket();
  const navigate = useNavigate("");

  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? "connected" : "connecting",
  );
  const [joinError, setJoinError] = useState("");

  const handleJoinRoom = () => {
    const emailId = email.trim();
    const roomCode = roomId.trim();

    if (!emailId || !roomCode) {
      setJoinError("Enter your email and room code.");
      return;
    }

    if (!socket.connected) {
      setJoinError(
        "The signaling server is unavailable. Check the deployed backend URL and try again.",
      );
      return;
    }

    setJoinError("");
    localStorage.setItem("emailId", emailId);
    socket.emit("join_room", {
      roomId: roomCode,
      emailId,
    });
  };

  const handleJoined = useCallback(({ roomId }) => {
    navigate(`/room/${roomId}`);
  }, [navigate]);

  useEffect(() => {
    const handleConnect = () => setConnectionStatus("connected");
    const handleDisconnect = () => setConnectionStatus("disconnected");
    const handleConnectError = () => setConnectionStatus("disconnected");

    socket.on("joined_room", handleJoined);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("joined_room", handleJoined);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, handleJoined]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-2">Join a Room</h1>

      <p className="text-gray-500 text-center mb-8">
        Enter your details to join a video call.
      </p>

      {connectionStatus !== "connected" && (
        <p className="text-red-600 text-center mb-4" role="status">
          {connectionStatus === "connecting"
            ? "Connecting to the signaling server..."
            : "Cannot connect to the signaling server. Check REACT_APP_SOCKET_URL in your deployment settings."}
        </p>
      )}
      {joinError && (
        <p className="text-red-600 text-center mb-4" role="alert">
          {joinError}
        </p>
      )}

      <div className="space-y-5">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter room code"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 "
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
          onClick={handleJoinRoom}
        >
          Enter Room
        </button>
      </div>
    </div>
  );
};

export default HomePage;
