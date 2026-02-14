import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// testing done on postman
const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel ID");
    }

    if(channelId === req.user._id.toString()){
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const channel = await User.findById(channelId);
    if(!channel){
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscriber = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    });
    if(existingSubscriber){
        await Subscription.findByIdAndDelete(existingSubscriber._id)

        return res
        .status(200)
        .json(
            new ApiResponse(200, null, "Channel unsubscribed successfully")
        )
    }

    const newSubscriber = await Subscription.create({
        channel: channelId,
        subscriber: req.user._id
    })
    return res
    .status(200)
    .json(
        new ApiResponse(200, newSubscriber, "Channel subscribed successfully")
    )
})

// testing done on postman
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // controller to return subscriber list of a channel
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel ID");
    }
    const channel = await User.findById(channelId);
    if(!channel){
        throw new ApiError(404, "Channel not found");
    }

    const subscriptions = await Subscription.find({
        channel: channelId
    }).populate("subscriber", "username avatar email");

    const subscribers = subscriptions.map(sub => sub.subscriber);
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribers, "User channel subcsribers fetched successfully")
    )
})

// testing done on postman
const getSubscribedChannels = asyncHandler(async (req, res) => {
    // controller to return channel list to which user has subscribed
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber ID");
    }

    const subscriber = await User.findById(subscriberId);
    if(!subscriber){
        throw new ApiError(404, "Subscriber not found");
    }

    const channel = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "username avatar email");

    const channels = channel.map(ch => ch.channel);
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, channels, "User subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}