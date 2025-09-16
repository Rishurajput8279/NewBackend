import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/ApiResponse.js";

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


export {registerUser}