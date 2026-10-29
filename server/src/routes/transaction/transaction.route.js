import express from "express";
import authenticateUser from "../../middleware/verifyUser.js";
import { getBalance, getHistory, send } from "./transaction.controller.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/balance", getBalance);
router.post("/send", send);
router.get("/history", getHistory);

export default router;