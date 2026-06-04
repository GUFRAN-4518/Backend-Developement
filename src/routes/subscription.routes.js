import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
    getSubscriptionStatus
} from "../controllers/subscription.controllers.js"
import {verifyJWT} from "../middlewares/authentication.middlewares.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file


router
    .route("/c/:channelId")
    .get(getSubscriptionStatus)
    .post(toggleSubscription);  

router
    .route("/u/:subscriberId")
    .get(getSubscribedChannels);     

export default router