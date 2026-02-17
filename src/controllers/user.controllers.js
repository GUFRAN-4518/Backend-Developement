import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

// testing done on postman
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { username, fullname, password, email } = req.body || {}
    // console.log("USERNAME : ", username)
    // console.log("FULLNAME : ", fullname)
    // console.log("PASSWORD : ", password)
    // console.log("EMAIL : ", email)
    // console.log("REQ.FILES =>", req.files)
    // console.log("BODY =>", req.body);

    // validation - not empty, email format, password strength
    if (
        [fullname, username, password, email].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists: username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // create user object - create entry in db
    const userObject = await User.create({
        fullname,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url,
        email,
        password,
        username: username.toLowerCase()
    })


    // remove password and refresh token field from response
    const createdUser = await User.findById(userObject._id).select(
        "-password -refreshToken"
    )


    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

// testing done on postman
const loginUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { email, password } = req.body || {}

    // login through either email or username
    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({ email })

    // find the user
    if (!user) {
        throw new ApiError(404, "user does not exist")
    }

    // check password is correct or not
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie
    const options = {
        httpOnly: true,
        secure: false,
        // secure: true,
        sameSite: "lax"
        // sameSite: "none"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

// testing done on postman
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))
})

// testing done on postman
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unathorrized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken }
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// testing done on postman
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and new password are required");
    }

    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )
})

// testing done on postman
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched successfully"
            )
        )
})

// testing done on postman
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Acount details updated successfully"))
})

// testing done on postman
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

// testing done on postman
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Cover Image is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverimage: coverImage.secure_url,
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    )
})



const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: { $regex: `^${username}$`, $options: "i" }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "videos",
                let: { channelId: "$_id" },
                pipeline: [
                {
                    $match: {
                    $expr: {
                        $and: [
                        { $eq: ["$owner", "$$channelId"] },
                        { $eq: ["$isPublished", true] }
                        ]
                    }
                    }
                },
                {
                    $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                    }
                },
                {
                    $unwind: "$owner"
                },
                {
                    $project: {
                    title: 1,
                    thumbnail: 1,
                    views: 1,
                    createdAt: 1,
                    isPublished: 1,
                    owner: {
                        username: 1,
                        avatar: 1
                    }
                    }
                }
                ],
                as: "videos"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                videos: {
                    $filter: {
                        input: "$videos",
                        as: "video",
                        cond: { $eq: ["$$video.isPublished", true] }
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
                coverImage: "$coverimage",
                subscribersCount: 1,
                videos: 1
            }
        }
    ]);

    if (!channel.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            channel[0],
            "Channel fetched successfully"
        )
    );
});


// // testing done on postman
// const getUserChannelProfile = asyncHandler(async (req, res) => {
//     const { username } = req.params

//     if (!username?.trim()) {
//         throw new ApiError(400, "username is missing")
//     }


//     const userDoc = await User.findOne({
//         username: username.toLowerCase()
//     });

//     if (!userDoc) {
//         throw new ApiError(404, "Channel does not exist");
//     }

//     // chat gpt 
//     const channel = await User.aggregate([
//         {
//             $match: { _id: userDoc._id }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscribers"
//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "subscriber",
//                 as: "subscribedTo"
//             }
//         },
//         {
//             $addFields: {
//                 subscriberIds: {
//                     $map: {
//                         input: "$subscribers",
//                         as: "s",
//                         in: "$$s.subscriber"
//                     }
//                 }
//             }
//         },
//         {
//             $addFields: {
//                 subscribersCount: { $size: "$subscribers" },
//                 channelsSubscribedToCount: { $size: "$subscribedTo" },
//                 isSubscribed: {
//                     $in: [req.user._id, "$subscriberIds"]
//                 }
//             }
//         },
//         {
//             $project: {
//                 username: 1,
//                 fullname: 1,
//                 avatar: 1,
//                 coverImage: 1,
//                 subscribersCount: 1,
//                 channelsSubscribedToCount: 1,
//                 isSubscribed: 1
//             }
//         }
//     ]);

//     if (!channel?.length) {
//         throw new ApiError(404, "Channel does not exist")
//     }


//     return res
//         .status(200)
//         .json(
//             new ApiResponse(200, channel[0], "User channel fetched successfully")
//         )
// })


// testing done on postman
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}