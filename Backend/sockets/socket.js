import { Server } from "socket.io";
import Message from "../models/Message.js";

const initializeSocket = (server)=>{
    const io = new Server(server,{
        cors:{
            origin: "*",
        },
    });

    io.on("connection",(socket)=>{
        console.log("User connected:",socket.id);

        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);

            console.log(
                `Socket ${socket.id} joined conversation ${conversationId}`
            );
        });

        socket.on("sendMessage", async ({ conversationId, senderId, text }) => {
            try {
                const message = await Message.create({
                    conversation: conversationId,
                    sender: senderId,
                    text,
                });

                io.to(conversationId).emit("newMessage", message);

                console.log("Message sent:", message._id);
            } catch (error) {
                console.error("Socket message error:", error.message);
            }
        });

        socket.on("disconnect",()=>{
            console.log("User diconnected:",socket.id);
        });
    });

    return io;
};

export default initializeSocket;