const { sendEmail } = require('../middleware/sendEmail');
const Post = require('../models/Post');
const User=require('../models/User')
const crypto = require("crypto");
const cloudinary = require ("cloudinary").v2


const multer = require("multer");
const streamifier = require("streamifier"); // Convert buffer to stream

// Configure Multer for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("avatar");

exports.serverMessage=async(req,res)=>{
    
        res.json({ message: 'Hello from the backend!' });
      
}
// Register Route
exports.register = async (req, res) => {
    try {
    
        // Handle File Upload with Multer
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: "File upload failed", error: err.message });
            }
          

            const { name, email, password } = req.body;
            let avatarData = {
                public_id: "default_avatar",
                url: "https://cdn-icons-png.flaticon.com/512/9187/9187532.png",
            };

            // Check if user already exists
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ message: "User already exists" });
            }

            // Function to Upload Image to Cloudinary
            const uploadToCloudinary = (buffer) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: "avatars" },
                        (error, result) => {
                            
                            if (error) return reject(error);
                            resolve({
                                public_id: result.public_id,
                                url: result.secure_url,
                            });
                        }
                    );
                    streamifier.createReadStream(buffer).pipe(stream);
                });
            };

            // Upload Image if File Exists
            if (req.file) {
                try {
                    avatarData = await uploadToCloudinary(req.file.buffer);
                } catch (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({ message: "Image upload to Cloudinary failed" });
                }
            }

            // Create and Save New User
            try {
                const newUser = new User({ name, email, password, avatar: avatarData });
                await newUser.save();
                const token = await newUser.generateToken();

                res.status(201).cookie("token", token, { 
                    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    httpOnly: true
                }).json({
                    success: true,
                    user: newUser,
                    token,
                });
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.login= async (req,res)=>{
    try{
        const {email, password}= req.body;
        const user = await User.findOne({email}).select("+password");
        
        if(!user)
        {
            console.log("user not found");
            return res.status(400).json({
                success:false,
                message:"User does not exist"
            });
        }else{
            const isMatch=await user.matchPassword(password);
            if(!isMatch)
            {
                return res.status(400).json({
                    success:false,
                    message:"Incorrect password"
                })
            }else{
                const token=await user.generateToken();
                const options = {
                    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    httpOnly: true,
                    secure: true, // 🔐 Only send cookie over HTTPS
                    sameSite: "None", // 🔄 Required for cross-origin cookies
                }
                res.status(200).cookie("token",token,options).json({
                    success:true,
                    user,
                    token
                })
                

            }
          
        }
    }catch(err){
        
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.logout=async (req,res)=>{
    try{
        res.status(200).cookie("token",null,{expires:new Date(Date.now()),httpOnly:true,secure: true, sameSite: "None"}).json({
            success:true,
            message:"Logged out"
        })
    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }   
}

exports.followUser=async (req,res)=>{
    try{
        const {id}=req.params;
        const user=await User.findById(req.user._id);
        const userToFollow=await User.findById(req.params.id);
        if(!userToFollow){
            return res.status(404).json({
                success:false,
                message:"User not found"
            })
        }
        if(user.following.includes(id)){
            const index=user.following.indexOf(id);
            user.following.splice(index,1);
            await user.save();   
            userToFollow.followers.pull(req.user._id);
            await userToFollow.save();     
            return res.status(200).json({
                success:true,
                message:"User Unfollowed"
            })
        }else{
            user.following.push(id);
            await user.save();
            userToFollow.followers.push(req.user._id);
            await userToFollow.save();
            return res.status(200).json({
                success:true,
                message:"User followed"
            })
        }
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }        
}    
 exports.updatePassword=async (req,res)=>{
    try{
        
        const user=await User.findById(req.user._id).select("+password");
        const {oldPassword,newPassword}=req.body;
       
        if(!oldPassword || !newPassword)
        {
            return res.status(400).json({
                success:false,
                message:"Please provide old and new password"
            })
        }
        const isMatch=await user.matchPassword(oldPassword);
        if(!isMatch)
        {
            return res.status(400).json({
                success:false,
                message:"Incorrect old password"
            })
        }
        user.password=newPassword;
        await user.save();    
        return res.status(200).json({
            success:true,
            message:"Password updated"        
        })    
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }        
}    

exports.updateProfile=async (req,res)=>{
    try{
     
      upload(req, res, async (err) => {
            const user=await User.findById(req.user._id);
            
            const { name, email} = req.body;  
            
            if(!name && !email)
            {
                return res.status(400).json({
                    success:false,
                    message:"Please provide name or email"
                })  
            }
            if(name){
                user.name=name;
            }
            if(email){
                user.email=email;
            }
            if (err) {
                return res.status(500).json({ message: "File upload failed", error: err.message });
            }
          
            // Function to Upload Image to Cloudinary
          if (req.file) { 
            
            const uploadToCloudinary = (buffer) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: "avatars" },
                        (error, result) => {
                            
                            if (error) return reject(error);
                            resolve({
                                public_id: result.public_id,
                                url: result.secure_url,
                            });
                        }
                    );
                    streamifier.createReadStream(buffer).pipe(stream);
                });
            };

            // Upload Image if File Exists
            if (req.file) {
                
                try {
                    avatarData = await uploadToCloudinary(req.file.buffer);
                    user.avatar={...avatarData}
                } catch (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({ message: "Image upload to Cloudinary failed" });
                }
            }}
            await user.save();
            return res.status(200).json({
                success:true,
                message:"Profile updated"
            })
        });
           
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}

exports.deleteMyProfile=async (req,res)=>{
    try{
       const user= await User.findById(req.user._id);
       
     try {
         await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.error("Cloudinary Deletion Error:", err);
      }
      
      
       const postIds = user.post.map(post => post);
       // Delete all the posts of the user
       for(let i=0;i<postIds.length;i++)
       {    
            const posts=await Post.findById(postIds[i]);
          if(posts)
           {await cloudinary.uploader.destroy(posts.image.public_id)
           await Post.findByIdAndDelete(postIds[i]);}
       }
       // Delete all the followers of the user
        for(let i=0;i<user.followers.length;i++)
       {
           const follower=await User.findById(user.followers[i]);
           follower.following.pull(req.user._id);
           await follower.save();
       }
       // Delete all the following of the user
       for(let i=0;i<user.following.length;i++)
       {
           const following=await User.findById(user.following[i]);
           following.followers.pull(req.user._id);
           await following.save();
       }
       // removing all comments of the user from all posts
       const allPosts= await Post.find();

       for(i=0; i<allPosts.length;i++)
       {
        const post = await Post.findById(allPosts[i]._id);
        for(let j=0;j<post.comments.length;j++)
        {
            if(post.comments[j].user==req.user._id)
            {
                post.comments.splice(j,1);
            }
        }
            
        await post.save();
       }
       await user.deleteOne();
       res.cookie("token",null,{expires:new Date(Date.now()),httpOnly:true,secure: true, sameSite: "None"});
       return res.status(200).json({
           success:true,
           message:"Profile deleted"
       })
       
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}

exports.myProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user._id).populate("post followers following");
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  exports.getUserProfile = async (req, res) => {
    try {
      const user = await User.findById(req.params.id).populate("post followers following");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

exports.getAllUsers = async (req, res) => {
    try {
      const users = await User.find({name:{$regex: req.query.name,$options:"i"}});
      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };    

  exports.forgotPassword=async (req,res)=>{    
    try{
        
        const user=await User.findOne({email:req.body.email});
        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            })
        }
        const resetPasswordToken=user.getResetPasswordToken();
        await user.save();
        //const resetUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetPasswordToken}`;
        const message=` \n ${resetPasswordToken}\n \n This token is valid for only 10 minutes`;
        
        try{            
            await sendEmail({email:user.email,subject:"Password Reset",message});
            res.status(200).json({
                success:true,
                message:`Email sent to ${user.email} reset password`
            })
        }catch(error){
            user.resetPasswordToken=undefined;
            user.resetPasswordExpire=undefined;
            await user.save();
            return res.status(500).json({
                success:false,
                message:error.message
            })
        }
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })      
    }    
}
exports.tokenValidate = async (req, res) => {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
  
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
  
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Token is invalid or has expired",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Token Verified",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };


exports.resetPassword = async (req, res) => {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
  
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
  
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Token is invalid or has expired",
        });
      }
  
      user.password = req.body.password;
  
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
  
      res.status(200).json({
        success: true,
        message: "Password Updated",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  exports.getMyPosts = async (req, res) => {    
    try {   
      const user = await User.findById(req.params.id);
      console.log(user);
      const posts = [];
      for (let i = 0; i < user.post.length; i++) {
        const post = await Post.findById(user.post[i]).populate("likes comments.user owner");
        if(post)
        {
            posts.push(post);
        }    
       
      }
      res.status(200).json({
        success: true,
        posts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  exports.getUserPost = async (req, res) => {    
    try {   
      const user = await User.findById(req.params.id);
      const posts = [];
      for (let i = 0; i < user.post.length; i++) {
        const post = await Post.findById(user.post[i]).populate("likes comments.user owner");
        if(post)
        {
            posts.push(post);
        }    
       
      }
      res.status(200).json({
        success: true,
        posts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  exports.getAllUserNames = async (req, res) => {
  try {
    console.log("getallusers")
    const users = await User.find(); // Only fetch the 'name' field

    res.status(200).json({
      success: true,
      users, // This will be an array of objects like { _id, name }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
