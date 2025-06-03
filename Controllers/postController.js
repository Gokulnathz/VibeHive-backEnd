const Post=require('../models/Post')
const User=require('../models/User')
const multer = require('multer');
const streamifier = require('streamifier');

const cloudinary = require('cloudinary').v2;

exports.createPost = async (req, res) => {
    try {
        console.log("create post")
        // Setup multer with memory storage
        const upload = multer({ storage: multer.memoryStorage() }).single('image');

        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: 'File upload failed', error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file provided' });
            }

            if (!req.user || !req.user._id) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // Function to upload from buffer
            const uploadFromBuffer = (buffer) =>
                new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'posts' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    streamifier.createReadStream(buffer).pipe(uploadStream);
                });

            let uploadResult;
            try {
                uploadResult = await uploadFromBuffer(req.file.buffer);
            } catch (uploadError) {
                return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadError.message });
            }

            // Create new post data
            const newPostData = {
                caption: req.body.caption,
                image: {
                    public_id: uploadResult.public_id,
                    url: uploadResult.secure_url,
                },
                owner: req.user._id,
            };

            const newPost = await Post.create(newPostData);

            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            user.post.push(newPost._id);
            await user.save();

            res.status(201).json({ success: true, newPost });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};
exports.deletePost=async (req,res)=>{
    try{
       
        const post=await Post.findById(req.params.id);
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        if(post.owner.toString()!==req.user._id.toString()){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }
       
        try {
            await cloudinary.uploader.destroy(post.image.public_id);
        } catch (cloudinaryError) {
            console.error("Error deleting image from Cloudinary:", cloudinaryError.message);
            return res.status(500).json({
                success: false,
                message: "Failed to delete image from Cloudinary",
                error: cloudinaryError.message,
            });
        }

        await post.deleteOne();
        const user= await User.findById(req.user._id)
        //console.log("params:",req.params.id);
        const index= user.post.indexOf(req.params.id)
        //console.log("index ",index);
        user.post.splice(index,1)
        await user.save();
        res.status(200).json({
            success:true,        
            message:"Post deleted"
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success:false,                    
            message:"Internal Server Error"
        })
}

}
exports.likeAndUnlikePost=async (req,res)=>{
    try{
        const post=await Post.findById(req.params.id);
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        if(post.likes.includes(req.user._id)){
            const index=post.likes.indexOf(req.user._id);
            post.likes.pull(req.user._id);
            post.likes.splice(index, 1);
            await post.save();
            return res.status(200).json({
                success:true,
                message:"Post Unliked"
            })
        }else{
            post.likes.push(req.user._id);
            await post.save();
            return res.status(200).json({
                success:true,
                message:"Post Liked"
            })
        }
    }catch(error){
        console.log(error);
        res.status(500).json({
            success:false,                    
            message:"Internal Server Error"
        })  
    }
}

exports.getPostOfFollowing=async (req,res)=>{    
    try{
        const user=await User.findById(req.user._id);
        //console.log(user);
        const posts=await Post.find({owner:{$in:user.following}}).populate("owner likes comments.user");
        //console.log(posts);
        res.status(200).json({
            success:true,
            posts:posts.reverse(),
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success:false,                    
            message:"Internal Server Error"
        })
    }
}
exports.updateCaption=async (req,res)=>{    

    try{
        console.log("inside update caption");
       
        const post=await Post.findById(req.params.id);
        // console.log("post: ",post)
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        if(post.owner.toString()!==req.user.id){
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            })
        }
        post.caption=req.body.caption;
        
        await post.save();
        return res.status(200).json({
            success:true,
            message:"Caption updated"
        })    
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
}
exports.addComment=async (req,res)=>{    
    try{
        const post=await Post.findById(req.params.id);
        //console.log(post);
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        let commentIndex=-1;
        post.comments.forEach((item,index)=>{            
            if(item.user.toString()===req.user._id.toString()){
                commentIndex=index;
            }
        })
        if(commentIndex!==-1){
            post.comments[commentIndex].comment=req.body.comment; 
            await post.save();
            return res.status(200).json({ success:true,message:"comment updated"})
        }
        
        const commentData={
            
                user:req.user._id,
                comment:req.body.comment
        }
        console.log(commentData);
        post.comments.push(commentData);
        await post.save();
        return res.status(200).json({
            success:true,
            message:"Comment added"
        })    
    }catch(error){
        return res.status(500).json({        
            success:false,
            message:error.message
        })
    }
}
exports.deleteComment=async (req,res)=>{    
    try{
        const post=await Post.findById(req.params.id);
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        console.log("req.body",req.body.commentId);
        if (post.owner.toString() === req.user._id.toString()) {
            if (req.body.commentId === undefined) {
              return res.status(400).json({
                success: false,
                message: "Comment Id is required",
              });
            }
      
            post.comments.forEach((item, index) => {
              if (item._id.toString() === req.body.commentId.toString()) {
                return post.comments.splice(index, 1);
              }
            });
      
            await post.save();
      
            return res.status(200).json({
              success: true,
              message: "Selected Comment has deleted",
            });
          } else {
            post.comments.forEach((item, index) => {
              if (item.user.toString() === req.user._id.toString()) {
                return post.comments.splice(index, 1);
              }
            });
      
            await post.save();
      
            return res.status(200).json({
              success: true,
              message: "Your Comment has deleted",
            });
          }
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
}

