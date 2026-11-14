const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcryptjs");
const { sendOTPEmail } = require("../utils/email");
const jwt = require("jsonwebtoken");

const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        console.log(`Registering user: ${name}, ${email}, ${role}`);
        
        let userexists = await User.findOne({ email });
        if (userexists) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
      // 1. Create the user in MongoDB
        savedUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user', 
            isverified: false // Matches your lowercase schema field
        });

        const otp = generateOTP();
        await OTP.create({ email, otp, action: 'account_verification' });
        
        // 2. Attempt to send the email
        try {
            await sendOTPEmail(email, otp, 'account_verification');
            console.log("TEMPORARY OTP FOR TESTING:", otp);
        } catch (emailError) {
            // Rollback: If email fails, delete the user so you don't get blocked by "User already exists" on retry
            await User.findByIdAndDelete(savedUser._id);
            console.error("Failed to send email, rolled back user creation:", emailError.message);
            return res.status(500).json({ message: 'Failed to send verification email. Please check email credentials.' });
        }

        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: savedUser.email
        });
    } catch (err) {
        res.status(400).json({ message: "Error registering user", error: err.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // FIXED: Changed 'isverified' to 'isVerified' to match schema and verifyOTP
        if (!user.isverified && user.role !== "admin") {
            const otp = generateOTP();

            await OTP.findOneAndDelete({
                email: user.email,
                action: "account_verification",
            });
            await OTP.create({
                email: user.email,
                otp,
                action: "account_verification",
            });
            await sendOTPEmail(user.email, otp, "account_verification");

            return res.status(403).json({
                message: "Account not verified. OTP sent to your email.",
                needsVerification: true,
                email: user.email,
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role),
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const validOTP = await OTP.findOne({
            email,
            otp,
            action: "account_verification",
        });

        if (!validOTP) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await User.findOneAndUpdate(
            { email },
            { isverified: true },
            { new: true }
        );
        
        await OTP.deleteOne({ _id: validOTP._id });

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role),
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};