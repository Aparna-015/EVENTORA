const express=require('express');
const router=express.Router();
const {registerUser,loginUser,veriFyotp}=require('../controllers/authController');

router.post('/register',registerUser);
router.post('/login',loginUser);
router.post('/verify-otp',veriFyotp);   

module.exports=router;