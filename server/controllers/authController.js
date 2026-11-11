const User=require('../models/User');
const OTP=require('../models/OTP');
const bcrypt=require('bcryptjs');
const {sendOTPEmail}=require('../utils/email');
const jwt = require('jsonwebtoken');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser=async(req,res)=>{
    const {name,email,password,role}=req.body;
let userexists=await User.findOne({email});   
if(userexists){
    return res.status(400).json({message:'User already exists'});
}
const salt=await bcrypt.genSalt(10);
const hashedPassword=await bcrypt.hash(password,salt);

try{
    const user= User.create({name,email,password:hashedPassword,role:'user', isVerified:false});
    
    const otp=Math.floor(100000+Math.random()*900000).toString();
    console.log(`OTP for ${email} is ${otp}`);
   
    await OTP.create({email,otp,type:'account_verification'});
     await sendOTPEmail(email,otp,'account_verification');
     res.status(201).json({message:'User registered successfully. Please verify your email with the OTP sent.',
        email:user.email});

}catch(err){
    res.status(400).json({message:'Error registering user',error:err.message});
}}




exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // FIXED: Changed 'isVerified' to 'isverified' to match your schema model
        if (!user.isverified && user.role !== 'admin') {
            // FIXED: Replaced generateOTP() with inline random 6-digit generation
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            await OTP.findOneAndDelete({ email: user.email, action: 'account_verification' });
            await OTP.create({ email: user.email, otp, action: 'account_verification' });
            await sendOTPEmail(user.email, otp, 'account_verification');
            
            return res.status(403).json({ 
                message: 'Account not verified. OTP sent to your email.', 
                needsVerification: true, 
                email: user.email 
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role) // Make sure generateToken is also imported/defined!
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const validOTP = await OTP.findOne({ email, otp, action: 'account_verification' });

        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
        await OTP.deleteOne({ _id: validOTP._id }); // Delete OTP after usage

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};