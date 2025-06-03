const express= require('express');
const app=express();
const router= require('./Routes/route')
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require('path');
require('./database')


if(process.env.NODE_ENV !="production")
{
    require("dotenv").config({path:"./"})
}

const hosts=["http://localhost:5173","http://localhost:5000","https://vibehive-frontend.onrender.com"]
// app.use(express.static(path.join(__dirname, "Social-media", "dist")));
app.use(cors({
    origin: function (origin, callback) {
        
        if (!origin || hosts.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    credentials: true,              // Allow credentials (cookies)
}));
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cookieParser());
app.use(router);
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "Social-media", "dist", "index.html"));
// });




module.exports=app
