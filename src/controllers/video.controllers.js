import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Subscription } from "../models/subscription.models.js"
import { generateVideoMetadataAndTranscript, generateTextEmbedding } from "../utils/ai.js";

// testing done on postman
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const filter = { isPublished: true };

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
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    let videos = [];

    if (query?.trim()) {
        const queryVector = await generateTextEmbedding(query);

        if (queryVector) {
            const pipeline = [
                {
                    $vectorSearch: {
                        index: "vector_index",
                        path: "embedding",
                        queryVector: queryVector,
                        numCandidates: 100,
                        limit: Number(limit) * 5 
                    }
                },
                {
                    $match: filter 
                },
                {
                    $sort: sortOptions
                },
                {
                    $skip: skip
                },
                {
                    $limit: Number(limit)
                }
            ];

            videos = await Video.aggregate(pipeline);
            
            await Video.populate(videos, { path: "owner", select: "username avatar" });
        } else {
            filter.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ];
            
            videos = await Video.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .populate("owner", "username avatar");
        }
    } else {
        videos = await Video.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .populate("owner", "username avatar");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                videos, 
                "All videos fetched successfully"
            )
        );
});

// testing done on postman
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, useAI } = req.body

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    const mimeType = req.files?.videoFile?.[0]?.mimetype || "video/mp4";

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    if (useAI !== "true" && useAI !== true && !title?.trim()) {
        throw new ApiError(400, "Title is required if not using AI optimization");
    }

    let aiMetadata = null;
    if (useAI === "true" || useAI === true) {
        aiMetadata = await generateVideoMetadataAndTranscript(videoFileLocalPath, mimeType);
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile?.url || !thumbnail?.url) {
        throw new ApiError(400, "Media upload failed");
    }

    const finalTitle = aiMetadata?.title || title;

    let finalDescription = aiMetadata?.description || description || "";
    if (aiMetadata?.transcript) {
        finalDescription += `\n\n--- AI Generated Transcript ---\n${aiMetadata.transcript}`;

    }
    const textToEmbed = `Title: ${finalTitle}. Description: ${finalDescription}`;

    const vectorEmbedding = await generateTextEmbedding(textToEmbed);
    
    const video = await Video.create({
        title: finalTitle,
        description: finalDescription,
        embedding: vectorEmbedding,
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        owner: req.user._id,
        isPublished: true,
        duration: videoFile.duration
    });

    if (!video) {
        throw new ApiError(500, "Failed to publish video");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"));
});

// testing done on postman
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // Adding .lean() converts the document and populated fields into plain JS objects instantly
    const video = await Video.findById(videoId)
        .populate("owner", "username avatar")
        .lean();

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video.isPublished) {
        throw new ApiError(403, "Video is not published");
    }

    const subscribersCount = await Subscription.countDocuments({
        channel: video.owner._id
    });

    video.owner.subscribersCount = subscribersCount;

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video fetched successfully"
            )
        );
});

// testing done on postman
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const { title, description } = req.body || {};
    const thumbnailLocalPath = req.file?.path;

    const updatedFields = {};
    if (title?.trim()) {
        updatedFields.title = title;
    }
    if (description?.trim()) {
        updatedFields.description = description;
    }
    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail?.url) {
            throw new ApiError(400, "Thumbnail upload failed");
        }
        updatedFields.thumbnail = thumbnail.secure_url;
    }

    if (Object.keys(updatedFields).length === 0) {
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
        { returnDocument: "after" }
    );

    if (!updatedVideo) {
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
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    //TODO: delete video
    const deletedVideo = await Video.findOneAndDelete({
        _id: videoId,
        owner: req.user._id
    });

    if (!deletedVideo) {
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

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const videoObject = await Video.findOne({
        _id: videoId,
        owner: req.user._id
    });
    if (!videoObject) {
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
