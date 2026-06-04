import mongoose, { isValidObjectId } from "mongoose"
import {User} from "../models/user.models.js"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// testing done on postman
const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID")
    }

    const channelExists = await User.exists({ _id: channelId });
    if (!channelExists) {
        throw new ApiError(404, "Channel not found")
    }

    const videos = await Video.find({ owner: channelId })
        .select("_id views")

    const totalVideos = videos.length

    const totalViews = videos.reduce(
        (acc, video) => acc + (video.views || 0),
        0
    )

    const videoIds = videos.map(video => video._id)

    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    })

    const totalLikes = videoIds.length > 0
        ? await Like.countDocuments({
              video: { $in: videoIds }
          })
        : 0

    const stats = {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalLikes
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Channel stats fetched successfully"
        )
    )
})


const getChannelVideos = asyncHandler(async (req, res) => {
        const channelId = req.user._id

        const { page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        
        const channelExists = await User.exists({ _id: channelId });
        if (!channelExists) {
            throw new ApiError(404, "Channel not found")
        }
        const videos = await Video.find({ owner: channelId })
            .populate("owner", "username avatar ")
            .select("_id title description thumbnail views createdAt isPublished")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
            
        return res.status(200).json(
            new ApiResponse(
                200,
                videos,
                "Channel videos fetched successfully"
            )
        )
})

export {
    getChannelStats, 
    getChannelVideos
}