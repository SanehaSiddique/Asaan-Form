const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // Add this for OTP generation

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,  // only for signup
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true, // Ensure emails are case-insensitive
        trim: true // Remove whitespace
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // OTP Fields
    otp: {
        type: String,
        required: false
    },
    otpExpiry: {
        type: Date,
        required: false
    },
    // Reset Token Fields
    resetToken: {
        type: String,
        required: false
    },
    resetTokenExpiry: {
        type: Date,
        required: false
    },
    // Track failed login attempts
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    // Check if the password is already hashed (e.g., starts with $2b$ for bcrypt)
    if (this.password.startsWith('$2b$')) {
        return next(); // Skip hashing if already hashed
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to generate OTP
userSchema.methods.generateOTP = function () {
    // Generate 6-digit OTP
    this.otp = crypto.randomInt(100000, 999999).toString();
    // Set expiry to 10 minutes from now
    this.otpExpiry = Date.now() + 10 * 60 * 1000;
    return this.otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (otp) {
    return this.otp === otp && this.otpExpiry > Date.now();
};

// Method to generate reset token
userSchema.methods.generateResetToken = function () {
    this.resetToken = crypto.randomBytes(20).toString('hex');
    this.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    return this.resetToken;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Account lockout for failed attempts
userSchema.methods.incrementLoginAttempts = function () {
    // If we have a previous lock that has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock the account if we've reached max attempts
    if (this.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
    }

    return this.updateOne(updates);
};

const User = mongoose.model("User", userSchema);
module.exports = User;