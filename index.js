const app= require('./app')

require("dotenv").config();
const cloudinary = require("cloudinary");

cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET
  });







const PORT = process.env.PORT || 5000
 app.listen(PORT,()=>console.log(`server running on ${PORT}`))