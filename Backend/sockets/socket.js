import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.userId = decoded.userId;

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    console.log("User ID:", socket.userId);

    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);

      console.log(
        `Socket ${socket.id} joined conversation ${conversationId}`
      );
    });

    socket.on("sendMessage", async ({ conversationId, text }) => {
      try {
        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text,
        });

        io.to(conversationId).emit("newMessage", message);

        console.log("Message sent:", message._id);
      } catch (error) {
        console.error("Socket message error:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export default initializeSocket;