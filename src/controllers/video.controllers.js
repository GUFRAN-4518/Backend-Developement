import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

// testing done on postman
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const filter = { isPublished: true };
    // const filter = { isPublished: false }; -> to get unpublished videos of a user, we can use this filter along with userId filter
    // const filter = { }; -> to get all videos irrespective of published or unpublished, we can use this filter along with userId filter

    if (query) {
        filter.title = { $regex: query, $options: "i" };
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID");
        }
        filter.owner = userId;
    }

    const sortOptions = {};
    const allowedSortFields = ["createdAt", "views", "duration", "title"];
    if (sortBy && allowedSortFields.includes(sortBy)) {
        sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
    } else {
        // Default sorting by creation date descending
        sortOptions.createdAt = -1;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .populate("owner", "username avatar");
        
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "All videos fetched successfully"
            )
        )
})

// testing done on postman
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if (!title?.trim()) {
        throw new ApiError(400, "Title is required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video is required");
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile?.url){
        throw new ApiError(400, "Video is required");
    }
    if(!thumbnail?.url){
        throw new ApiError(400, "Thumbnail is required");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        owner: req.user._id,
        isPublished: true,
        duration : videoFile.duration    
    });

    if(!video){
        throw new ApiError(500, "Failed to publish video");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                video,
                "Video published successfully"
            )
        )
})

// testing done on postman
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    //TODO: get video by id
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if (!video.isPublished) {
        throw new ApiError(403, "Video is not published")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        )
})

// testing done on postman
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body || {};
    const thumbnailLocalPath = req.file?.path;
    
    const updatedFields = {};
    if(title?.trim()){
        updatedFields.title = title;
    }
    if(description?.trim()){
        updatedFields.description = description;
    }
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail?.url){
            throw new ApiError(400, "Thumbnail upload failed");
        }
        updatedFields.thumbnail = thumbnail.secure_url;
    }

    if(Object.keys(updatedFields).length === 0){
        throw new ApiError(400, "At least one field (title, description, thumbnail) is required to update")
    }

    const updatedVideo = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user._id
        },
        {
            $set: updatedFields
            
        },
        {new: true}
    );

    if(!updatedVideo){
        throw new ApiError(404, "Video not found or unauthorized")
    }
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideo,
                "Video updated successfully"
            )
        )
})

// testing done on postman
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }
    //TODO: delete video
    const deletedVideo = await Video.findOneAndDelete({
        _id: videoId,
        owner: req.user._id
    });

    if(!deletedVideo){
        throw new ApiError(404, "Video not found or unauthorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedVideo,
            "Video deleted successfully"
        )
    )
})

// testing done on postman
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID");
    }

    const videoObject = await Video.findOne({
            _id: videoId,
            owner: req.user._id
    });
    if(!videoObject){
        throw new ApiError(400, "Video not found or unauthorized");
    }

    videoObject.isPublished = !videoObject.isPublished
    await videoObject.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoObject,
            "Publish status toggled successfully"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
