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
    // Validate profile data
    if (!profile || !profile.id) {
      throw new Error('Invalid Google profile: missing id');
    }
    
    if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
      throw new Error('Invalid Google profile: missing email');
    }
    
    const email = profile.emails[0].value.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format from Google profile: ${email}`);
    }
    
    // Try to find user by googleId
    let user = await this.findOne({ googleId: profile.id });
    
    if (user) {
      // Update last login and picture if changed
      user.lastLoginAt = new Date();
      if (profile.photos && profile.photos[0]?.value) {
        user.picture = profile.photos[0].value;
      }
      await user.save();
      return user;
    }

    // Try to find user by email (in case they registered with email first)
    user = await this.findOne({ email: email });
    
    if (user) {
      // Link Google account to existing email account
      // Only if user doesn't already have a googleId
      if (!user.googleId) {
        user.googleId = profile.id;
        user.authProvider = 'google'; // Switch to Google auth
      }
      if (profile.photos && profile.photos[0]?.value) {
        user.picture = profile.photos[0].value;
      }
      user.lastLoginAt = new Date();
      await user.save();
      return user;
    }

    // Create new user
    const name = profile.displayName || 
                 (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : 'User') ||
                 email.split('@')[0];
    
    // Log user creation attempt
    console.log('Creating new Google user:', { email, name, googleId: profile.id });
    
    try {
      user = await this.create({
        email: email,
        name: name || 'User',
        picture: profile.photos && profile.photos[0]?.value ? profile.photos[0].value : null,
        googleId: profile.id,
        authProvider: 'google',
        lastLoginAt: new Date()
      });

      console.log('New Google user created successfully:', { userId: user._id, email: user.email });
    } catch (createError) {
      console.error('Error creating Google user:', createError);
      console.error('User data:', { email, name, googleId: profile.id });
      throw createError;
    }
    return user;
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;

