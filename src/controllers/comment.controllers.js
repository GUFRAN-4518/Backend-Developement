import mongoose from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// testing done on postman
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    const skip = (Number(page) - 1)*(Number(limit));
    const comments = await Comment.find({video: videoId})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("owner", "username avatar")
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comments,
                "All comments fetched successfully"
            )
        )
})

// testing done on postman
const addComment = asyncHandler(async (req, res) => {
    const {content} = req.body || {};
    const {videoId} = req.params;

    if(!content?.trim()){
        throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if(!comment){
        throw new ApiError(500, "Failed to add comment");
    }

    // CRITICAL FIX: Populate owner details immediately on creation
    await comment.populate("owner", "username avatar");

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                comment,
                "Comment added successfully"
            )
        )
});

// testing done on postman
const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {videoId, commentId} = req.params;
    const {content} = req.body;
    if(!content?.trim()){
        throw new ApiError(400, "Comment Content is required");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id,
        },
        {
            $set: {
                content: content
            }
        },
        { new : true }
    )

    if(!updatedComment){
        throw new ApiResponse(500, "Comment not found or unauthorized");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )
})

// testing done on postman
const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;

    const deletedComment = await Comment.findByIdAndDelete({
        _id: commentId,
        owner: req.user._id
    });

    if(!deletedComment){
        throw new ApiError(404, "Comment not found or unathorized");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedComment,
            "Comment has been deleted successfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
