import express from "express";
import { createOrGetConversation } from "../controllers/conversationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router=express.Router();

router.post("/", protect, createOrGetConversation);

export default router;