const mongoose=require("mongoose")
require('dotenv').config(); 
const CONNECTION_STRING= process.env.CONNECTION_STRING

if (!CONNECTION_STRING) {
    console.error("Error: CONNECTION_STRING is not defined in .env file.");
    process.exit(1); // Exit process with failure
}

mongoose.connect(CONNECTION_STRING,).then(()=>{
    console.log("MongoDB Atlas successfully connected to VibeHive-Server...")
}).catch((err)=>{
    console.log("mongodb connection failed!!!",err);
    
})