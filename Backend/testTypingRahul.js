import { io } from "socket.io-client";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTgxOGU5ZjBlMzJlZDM5YTgwMDRiY2IiLCJpYXQiOjE3ODY5NDY0NjIsImV4cCI6MTc4NzU1MTI2Mn0.xv_1AMBR8Y4d7Z1Wb8ZIZBHupQ5DirfG4wNFzSS09Ck";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  auth: {
    token,
  },
});

socket.on("connect", () => {
  console.log("Rahul connected:", socket.id);

  const conversationId = "6a818faa0e32ed39a8004bcc";

  socket.emit("joinConversation", conversationId);
});

socket.on("userTyping", (data) => {
  console.log("USER TYPING:", data);
});

socket.on("userStoppedTyping", (data) => {
  console.log("USER STOPPED TYPING:", data);
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});

socket.on("disconnect", () => {
  console.log("Rahul disconnected");
});