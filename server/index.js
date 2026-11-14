console.log("🔥 SERVER SCRIPT IS STARTING...");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express=require('express');
const cors=require('cors');
const dotenv=require('dotenv');
dotenv.config();
const authRoutes=require('./routes/auth');

const mongoose=require('mongoose');



mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('Connection Error:', err));   

const app=express();
app.use(cors());
app.use(express.json());

// ---> PUT THE DEBUG LOGGER RIGHT HERE <---
app.use((req, res, next) => {
    console.log(`---> INCOMING REQUEST: ${req.method} ${req.url}`);
    next();
});

app.get("/test", (req, res) => {
    res.send("Server is working!");
});

const PORT=process.env.PORT || 5000;
app.use("/api/auth",authRoutes);
app.use("/api/events",require('./routes/events'));
app.use("/api/bookings",require('./routes/booking'));
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
