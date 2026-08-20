import express from "express";
import {
    createOrGetConversation,
    createGroup,
    addMember,
    removeMember,
    leaveGroup,
    changeGroupAdmin,
    getMyConversations,
} from "../controllers/conversationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router=express.Router();

router.post("/", protect, createOrGetConversation);
router.post("/group",protect,createGroup);
router.post("/:conversationId/members",protect,addMember);
router.delete("/:conversationId/members",protect,removeMember);
router.put("/:conversationId/admin",protect,changeGroupAdmin);
router.delete("/:conversationId/leave",protect,leaveGroup);
router.get("/",protect,getMyConversations);

export default router;