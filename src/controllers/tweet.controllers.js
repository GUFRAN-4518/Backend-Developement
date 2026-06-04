import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// testing done on postman
const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body || {};
    if(!content?.trim()){
        throw new ApiError(401, "Tweet Content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if(!tweet){
        throw new ApiError(401, "Failed to create tweet");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, tweet, "Tweet has been created successfully")
        )
})

// testing done on postman
const getUserTweets = asyncHandler(async (req, res) => {
    const tweets = await Tweet.find({
        owner: req.user._id
    }).sort({ createdAt: -1})
    return res
        .status(201)
        .json(
            new ApiResponse(201, tweets, "Tweets fetched successfully")
        )
})

// testing done on postman
const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body || {}

    if (!content?.trim()){
        throw new ApiError(400, "Tweet content is required")
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        {
            _id: tweetId,
            owner: req.user._id
        },
        {
            $set: {
                content: content
            }
        },
        { new: true }
    )

    if (!newTweet) {
        throw new ApiError(404, "Tweet not found or unauthorized")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newTweet,
                "Tweet updated successfully"
            )
        )
})

// testing done on postman
const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    const deletedTweet = await Tweet.findByIdAndDelete({
        _id: tweetId,
        owner: req.user._id
    });

    if(!deletedTweet){
        throw new ApiError(404, "Tweet not found or unauthorized")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedTweet,
                "Tweet has been deleted successfully"
            )
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
