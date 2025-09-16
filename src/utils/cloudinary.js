import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
});



const uploadOnCloudinary=async (localFilePath) =>{
    try{
        if(!localFilePath){
            return null
        }
        // upload the file on cloundinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // file has been upload successfuly
        // console.log("File is upload on cloudinary ",response.url);
        fs.unlinkSync(localFilePath);
        // console.log("Respone:-" ,response);
        return response

    }
    catch(error){
        //remove the locally saved temporary file as the upload operation is fail
        fs.unlinkSync(localFilePath)
        return null
    } 
}



export {uploadOnCloudinary}