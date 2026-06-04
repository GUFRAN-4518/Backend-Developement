import { Router } from "express";
import { addView } from "../controllers/views.controllers.js";

const router = Router();

router.post("/v/:videoId", addView);

export default router;