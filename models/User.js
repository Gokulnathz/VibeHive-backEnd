const mongoose=require('mongoose')
const bcrypt= require('bcrypt')
const jwt=require('jsonwebtoken')   
const crypto = require("crypto");

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Please enter a name"],
    },
    
    email:{
        type:String,
        required:[true,"Please enter a email"],
        unique:[true,"Email already exist"],
    },
    password:{
        type:String,
        required:[true,"Please enter a password"],
        minLength:[6,"password must be at least 6 characters"],
        select:false,
    },
    avatar:{
        public_id:String,
        url:String,

    },
    post:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Post"
    }],
    followers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
    }],
    following:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
    }],
    resetPasswordToken:String,
    resetPasswordExpire:Date

})


userSchema.pre("save",async function (next){
    if(this.isModified("password"))
    {this.password = await bcrypt.hash(this.password,10);}
    next();
})

userSchema.methods.matchPassword=async function(password){
    return await bcrypt.compare(password,this.password);
}
userSchema.methods.generateToken=async function(){
    return await jwt.sign({_id:this._id},process.env.JWT_SECRET);
}

userSchema.methods.getResetPasswordToken= function(){
    const resetToken =  crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    //console.log(resetToken);
    return resetToken;
};
module.exports= mongoose.model('User',userSchema)