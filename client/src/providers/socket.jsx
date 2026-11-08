import React, { useMemo } from "react";
import { io } from "socket.io-client";

const SocketContext = React.createContext(null);

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () =>
      io(
        process.env.REACT_APP_SOCKET_URL ||
          (process.env.NODE_ENV === "development"
            ? "http://localhost:8000"
            : window.location.origin),
      ),
    [],
  );

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
