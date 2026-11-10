const User=require('../models/userSchema');
const OTP=require('../models/OTP');
const bcrypt=require('bcryptjs');
const {sendOTPEmail}=require('../utils/emailService');


exports.registerUser=async(req,res)=>{
    const {name,email,password,role}=req.body;
let userexists=await UserSchema.findOne({email});   
if(userexists){
    return res.status(400).json({message:'User already exists'});
}
const salt=await bcrypt.genSalt(10);
const hashedPassword=await bcrypt.hash(password,salt);

try{
    const user=new User.create({name,email,password:hashedPassword,role:'user', isVerified:false});
    
    const otp=math.floor(100000+Math.random()*900000).tostring();
    console.log(`OTP for ${email} is ${otp}`);
   
    await OTP.create({email,otp,type:'account_verification'});
     await sendOTPEmail(email,otp,'account_verification');
     res.status(201).json({message:'User registered successfully. Please verify your email with the OTP sent.',
        email:user.email});

}catch(err){
    res.status(400).json({message:'Error registering user',error:err.message});
}}