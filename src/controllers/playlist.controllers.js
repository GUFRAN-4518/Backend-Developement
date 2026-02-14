import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// testing done on postman
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    if (!name?.trim()) {
        throw new ApiError(400, "Playlist Name is required")
    }
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description?.trim(),
        owner: req.user._id
    })
    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                playlist,
                "Playlist created successfully"
            )
        )
})

// testing done on postman
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const userPlaylists = await Playlist.find({
        owner: userId
    })
        .populate({
            path: "videos",
            select: "title thumbnail duration owner"
        })
        .sort({ createdAt: -1 });

    if (!userPlaylists) {
        throw new ApiError(404, "No playlists found for this user")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, userPlaylists, "User's playlists fetched successfully")
        )
})

// testing done on postman
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        })

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Playlist fethced successfully")
        )
})

// testing done on postman
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID")
    }

    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
            videos: { $ne: videoId } 
        },
        {
            $addToSet: { videos: videoId }
        },
        { new: true }
    );

    if (!playlist) {
        throw new ApiError(400, "Playlist not found, unauthorized, or video already exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Video added to playlist successfully")
        )
})

// testing done on postman
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID")
    }

    const playlist = await Playlist.findOne({
        _id: playlistId,
        owner: req.user._id
    });

    if (!playlist) {
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }

    if (!playlist.videos.some(v => v.toString() === videoId)) {
        throw new ApiError(400, "Video is not in this playlist");
    }

    playlist.videos.pull(videoId);
    await playlist.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Video removed from playlist successfully")
        )
})

// testing done on postman
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }

    const deletedPlaylist = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    })

    if (!deletedPlaylist) {
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedPlaylist, "Playlist deletedd successfully")
        )
})

// testing done on postman
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID");
    }
    
    if(name !== undefined && !name.trim()){
        throw new ApiError(400, "Playlist name cannot be empty");
    }

    const updatedData = {};
    if(name !== undefined) updatedData.name = name.trim();
    if(description !== undefined) updatedData.description = description.trim();

    if(Object.keys(updatedData).length === 0){
        throw new ApiError(400, "At least one field is required to update");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $set: updatedData
        },
        {new: true}
    )

    if(!updatedPlaylist){
        throw new ApiError(404, "Playlist not found or unauthorized");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
