import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uplloadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req, res)=>{
    // get user details from frontend
    const {username, fullname, password, email} = req.body || {}
    console.log("USERNAME : ", username)
    console.log("FULLNAME : ", fullname)
    console.log("PASSWORD : ", password)
    console.log("EMAIL : ", email)
    console.log("REQ.FILES =>", req.files)
    console.log("BODY =>", req.body);

    // validation - not empty, email format, password strength
    if(
        [fullname, username, password, email].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists: username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    // upload them to cloudinary
    const avatar = await uplloadOnCloudinary(avatarLocalPath);
    const coverImage = await uplloadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    // create user object - create entry in db
    const userObject = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    

    // remove password and refresh token field from response
    const createdUser = await User.findById(userObject._id).select(
        "-password -refreshToken"
    )
    

    // check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export {
    registerUser,
}