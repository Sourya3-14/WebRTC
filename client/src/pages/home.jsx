import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../providers/socket.jsx";

const HomePage = () => {
  const { socket } = useSocket();
  const navigate = useNavigate("");

  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleJoinRoom = () => {
    localStorage.setItem("emailId", email);

    socket.emit("join_room", {
      roomId,
      emailId: email,
    });
  };

  const handleJoined = useCallback(({ roomId }) => {
    // console.log("room joined", roomId);
    navigate(`/room/${roomId}`);
  }, [navigate]);

  useEffect(() => {
    socket.on("joined_room", handleJoined);

    return () => {
      socket.off("joined_room", handleJoined);
    };
  }, [socket, handleJoined]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-center mb-2">Join a Room</h1>

      <p className="text-gray-500 text-center mb-8">
        Enter your details to join a video call.
      </p>

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
