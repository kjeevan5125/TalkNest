import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/user.js";

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

    User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
    }).catch((error) => {
      console.error("Online status error:", error.message);
    });

    socket.on("joinConversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of ${conversationId}`
          );

          return;
        }

        socket.join(conversationId);

        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`
        );
      } catch (error) {
        console.error(
          "Join conversation error:",
          error.message
        );
      }
    });

    socket.on("sendMessage", async ({ conversationId, text }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of ${conversationId}`
          );

          return;
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text,
        });

        io.to(conversationId).emit("newMessage", message);

        console.log("Message sent:", message._id);
      } catch (error) {
        console.error(
          "Socket message error:",
          error.message
        );
      }
    });

    socket.on("markAsRead", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
        });

        if (!conversation) {
          console.log(
            `User ${socket.userId} is not a participant of ${conversationId}`
          );

          return;
        }

        const result = await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: socket.userId },
            isRead: false,
          },
          {
            $set: {
              isRead: true,
            },
          }
        );

        console.log(
          `Messages marked as read: ${result.modifiedCount}`
        );
      } catch (error) {
        console.error(
          "Mark as read error:",
          error.message
        );
      }
    });

    socket.on("typing", (conversationId) => {
      socket.to(conversationId).emit("userTyping", {
        userId: socket.userId,
      });
    });

    socket.on("stopTyping", (conversationId) => {
      socket.to(conversationId).emit("userStoppedTyping", {
        userId: socket.userId,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
      }).catch((error) => {
        console.error(
          "Offline status error:",
          error.message
        );
      });
    });
  });

  return io;
};

export default initializeSocket;