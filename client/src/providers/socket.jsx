import React, { useMemo } from "react";
import { io } from "socket.io-client";

const SocketContext = React.createContext(null);

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () => io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8001"),
    [],
  );

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
