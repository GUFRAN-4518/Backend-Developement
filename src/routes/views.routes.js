import { Router } from "express";
import { addView } from "../controllers/views.controllers.js";

const router = Router();

// No auth needed (views should work for everyone)
router.post("/v/:videoId", addView);

export default router;