const express = require("express");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const io = new Server({
  cors: true,
});

const app = express();

app.use(bodyParser.json());

const email_to_socket = new Map();
const socket_to_email = new Map();

io.on("connection", (socket) => {
  console.log("new connection");
  socket.on("join_room", (data) => {
    const { roomId, emailId } = data;
    console.log("user ", emailId, "joined room", roomId);
    email_to_socket.set(emailId, socket.id);
    socket_to_email.set(socket.id, emailId);
    socket.join(roomId);
    socket.emit("joined_room", { roomId });
    socket.broadcast.to(roomId).emit("user_joined", { emailId });
  });

  socket.on("call_user", (data) => {
    const { emailId, offer } = data;
    const fromEmail = socket_to_email.get(socket.id); // sender socket id
    const socketId = email_to_socket.get(emailId); //receiver socket id fetheced from mapping

    console.log("call sent from ", fromEmail, "to ", emailId);

    socket.to(socketId).emit("incomming_call", { from: fromEmail, offer });
  });

  socket.on("call_accepted", (data) => {
    const { emailId, ans } = data;
    const socketId = email_to_socket.get(emailId);

    const fromEmail = socket_to_email.get(socket.id); // sender socket id
    console.log(fromEmail, " accepted the call of ", emailId);

    socket.to(socketId).emit("call_accepted", { ans });
  });

  socket.on("peer_nego_needed", ({ emailId, offer }) => {
    const fromEmail = socket_to_email.get(socket.id);
    const socketId = email_to_socket.get(emailId);

    console.log("negotiation request initiated by ", fromEmail);

    socket.to(socketId).emit("peer_nego_needed", {
      offer,
      from: fromEmail,
    });
  });

  socket.on("peer_nego_done", ({ emailId, ans }) => {
    const socketId = email_to_socket.get(emailId);

    const fromEmail = socket_to_email.get(socket.id);
    console.log("negotiation request completed by ", fromEmail);

    socket.to(socketId).emit("peer_nego_final", {
      ans,
    });
  });
  socket.on("ice_candidate", ({ emailId, candidate }) => {
    const socketId = email_to_socket.get(emailId);

    const fromEmail = socket_to_email.get(socket.id);
    console.log("ICe candiate came from ", fromEmail);

    socket.to(socketId).emit("ice_candidate", {
      candidate,
    });
  });

  socket.on("disconnect", () => {
    const email = socket_to_email.get(socket.id);

    if (email) {
      email_to_socket.delete(email);
      socket_to_email.delete(socket.id);
    }

    console.log("Disconnected", socket.id);
  });
});

app.listen(8000, console.log("http server running at port 8000"));
io.listen(8001, console.log("socket server running at port 8001"));
