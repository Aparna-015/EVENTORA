
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express=require('express');
const cors=require('cors');
const dotenv=require('dotenv');
dotenv.config();

const mongoose=require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('Connection Error:', err));   

const app=express();



const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
