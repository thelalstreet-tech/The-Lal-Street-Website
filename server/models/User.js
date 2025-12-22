// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    // Only required for email/password auth
    required: function() {
      return this.authProvider === 'email';
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  picture: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    default: null
  },
  authProvider: {
    type: String,
    required: true,
    enum: ['google', 'email'],
    default: 'email'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      // Remove password from JSON output
      delete ret.password;
      return ret;
    }
  }
});

// Note: Indexes are automatically created by 'unique: true' on email and googleId fields
// No need to manually create them to avoid duplicate index warnings

// Hash password before saving (only for email/password users)
userSchema.pre('save', async function(next) {
  // Only hash if password is modified and user is using email auth
  if (!this.isModified('password') || this.authProvider !== 'email') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find or create user from Google profile
userSchema.statics.findOrCreateGoogleUser = async function(profile) {
  try {
    // Try to find user by googleId
    let user = await this.findOne({ googleId: profile.id });
    
    if (user) {
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
      return user;
    }

    // Try to find user by email (in case they registered with email first)
    user = await this.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing email account
      user.googleId = profile.id;
      user.authProvider = 'google'; // Switch to Google auth
      user.picture = profile.photos[0]?.value || user.picture;
      user.lastLoginAt = new Date();
      await user.save();
      return user;
    }

    // Create new user
    user = await this.create({
      email: profile.emails[0].value,
      name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
      picture: profile.photos[0]?.value || null,
      googleId: profile.id,
      authProvider: 'google',
      lastLoginAt: new Date()
    });

    return user;
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;

