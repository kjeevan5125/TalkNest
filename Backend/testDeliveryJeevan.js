import { io } from "socket.io-client";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTgwYWMzY2Y3NTY4YjlkY2E3YWMzYTEiLCJpYXQiOjE3ODY4NzU2ODUsImV4cCI6MTc4NzQ4MDQ4NX0.sfLyH9LH4c67HuDZwtUGm3TF1f0nauMZ_knAUmGJoNM";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  auth: {
    token,
  },
});

socket.on("connect", () => {
  console.log("Jeevan connected:", socket.id);

  const conversationId = "6a818faa0e32ed39a8004bcc";

  socket.emit("joinConversation", conversationId);

  setTimeout(() => {
    console.log("Jeevan sending message...");

    socket.emit("sendMessage", {
      conversationId,
      text: "Testing delivery status",
    });
  }, 3000);
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});

socket.on("disconnect", () => {
  console.log("Jeevan disconnected");
});