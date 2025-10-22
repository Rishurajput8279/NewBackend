import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefereshTokens= async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false });

        return {refreshToken, accessToken};
    }
    catch(error){
        throw new ApiError(500, "Somthing Went wrong while Generating refresh and Access Token");
    }
}


const registerUser= asyncHandler(async (req , res)=>{
    // get user data from frontend;
    // validation - not empty
    // check - if user already register (email,username)
    // check for image,check for avatar
    // upload them to cloudnary , avatar
    // create user obj, create entity in db
    // remove the password , refresh tokem field from resposnse
    // check for user creation
    // return res
    

    const {fullName, email,username, password}=req.body;
    // console.log("Req Body: ",req.body);

    // if(fullName === ""){
    //     throw new ApiError(400, "Fulname is required");
    // }

    if(
        [fullName, email, username, password].some((field)=>
            field?.trim() === "") 
    ){
        throw new ApiError(400, "All field are required");
    }

    const existedUser=await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "user with email or username already exits");
    }
    
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverimagePath=req.files?.coverImage[0]?.path;

    let coverimagePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverimagePath=req.files.coverImage[0].path;
    }

    // console.log("Request: " ,req.files);
    if(!avatarLocalPath){
        throw new ApiError(400, "Avtar file is required");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverimagePath);

    if(!avatar){
        throw new ApiError(400, "Avtar file is required");
    }

    const user= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "something went wrong while regestring user");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User Register Successfully")
    )
    

})

const loginUser =asyncHandler(async (req,res)=>{
    const {
        username, email, password
    }=req.body;
    if(!(username || email)){
        throw new ApiError(400, "userName or email is required");
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(400,"User does not exits");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id);

    const loggedIn=await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly: true,
        secure: true
    }
    
    return res.
    status(200).
    cookie("accessToken", accessToken, options).
    cookie("refreshToken", refreshToken, options).
    json(
        new apiResponse( 
            200,
            {
                user: loggedIn, accessToken, refreshToken
            },
            "User logged In SuccessFully"
        )
    )
})

const logoutUser=asyncHandler( async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )
    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request");
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"inValid refresh token - user not found");
        }
        if(incomingRefreshToken !==user.refreshToken){
            throw new ApiError(401,"Refresh token is expried or used");
        }
        const options={
            httpOnly: true,
            secure: true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefereshTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken,options)
        .json(
            new apiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    }
    catch(error){
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

export {registerUser, loginUser,logoutUser,refreshAccessToken}