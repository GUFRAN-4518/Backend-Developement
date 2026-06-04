import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {Comment} from "../models/comment.models.js"
import {Tweet} from "../models/tweet.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// testing done on postman
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    let liked;

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        liked = false;
    } else {
        await Like.create({
            video: videoId,
            likedBy: req.user._id
        });
        liked = true;
    }

    const likesCount = await Like.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                liked,
                likesCount
            },
            liked ? "Video liked successfully" : "Video unliked successfully"
        )
    );
});

const getLikeStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    const likesCount = await Like.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                liked: !!existingLike,
                likesCount
            },
            "Like status fetched"
        )
    );
});

// testing done on postman
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    const existingComment = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if(existingComment){
        await Like.findByIdAndDelete(existingComment._id);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Comment unliked successfully"
            )
        )
    }

    const newLike = await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            newLike,
            "Comment liked successfully"
        )
    )
})

// testing done on postman
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");


    const existingTweet = await Like.findOne({
        Tweet: tweetId,
        likedBy: req.user._id
    });
    
    if(existingTweet){
        await Like.findByIdAndDelete(existingTweet._id);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Tweet unliked successfully"
            )
        )
    }
    
    const newLike = await Like.create({
        Tweet: tweetId,
        likedBy: req.user._id
    })
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            newLike,
            "Tweet liked successfully"
        )
    )
})

// testing done on postman
const getLikedVideos = asyncHandler(async (req, res) => {
    const videos = await Like.find({
        likedBy: req.user._id,
        video: { $ne: null }
    }).populate("video")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "All liked videos fetched successfully"
        )
    )
})

// testing done on postman
const getLikedComments = asyncHandler(async (req, res) => {
    const comments = await Like.find({
        likedBy: req.user._id,
        comment: { $ne: null }
    }).populate("comment")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comments,
            "All liked comments fetched successfully"
        )
    )
})

// testing done on postman
const getLikedTweets = asyncHandler(async (req, res) => {
    const tweets = await Like.find({
        likedBy: req.user._id,
        Tweet: { $ne: null }
    }).populate("Tweet")
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            tweets,
            "All liked tweets fetched successfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getLikedComments,
    getLikedTweets,
    getLikeStatus
}