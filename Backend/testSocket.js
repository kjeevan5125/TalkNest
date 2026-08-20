import { io } from "socket.io-client";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTgwYWMzY2Y3NTY4YjlkY2E3YWMzYTEiLCJpYXQiOjE3ODY4NzU2ODUsImV4cCI6MTc4NzQ4MDQ4NX0.sfLyH9LH4c67HuDZwtUGm3TF1f0nauMZ_knAUmGJoNM";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  auth: {
    token,
  },
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  console.log("Socket authentication successful");

  const conversationId = "6a818faa0e32ed39a8004bcc";

  console.log("Sending join request:", conversationId);

  socket.emit("joinConversation", conversationId);

  setTimeout(() => {
    console.log("TIMER FIRED");

    socket.emit("sendMessage", {
      conversationId,
      text: "Testing message authorization",
    });

    console.log("Message event emitted");
  }, 3000);

  setTimeout(() => {
    console.log("Marking messages as read...");

    socket.emit(
      "markAsRead",
      "6a818faa0e32ed39a8004bcc"
    );
  }, 10000);
});

socket.on("newMessage", (message) => {
  console.log("NEW MESSAGE:", message);
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});