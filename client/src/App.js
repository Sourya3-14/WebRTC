import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { SocketProvider } from "./providers/socket.jsx";
import { PeerProvider } from "./providers/peer.jsx";

import HomePage from "./pages/home";
import RoomPage from "./pages/room";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <SocketProvider>
          <PeerProvider>
            <Routes>
              <Route path="/" element={<HomePage />}></Route>
              <Route path="/room/:roomId" element={<RoomPage />}></Route>
            </Routes>
          </PeerProvider>
        </SocketProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
