import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controllers.js"
import {verifyJWT} from "../middlewares/authentication.middlewares.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// router
//     .route("/c/:channelId")
//     .get(getSubscribedChannels)
//     .post(toggleSubscription);

// router.route("/u/:subscriberId").get(getUserChannelSubscribers);

router
    .route("/c/:channelId")
    .get(getUserChannelSubscribers)   // ← correct
    .post(toggleSubscription);

router
    .route("/u/:subscriberId")
    .get(getSubscribedChannels);      // ← correct

export default router