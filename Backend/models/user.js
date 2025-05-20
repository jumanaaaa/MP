const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
  type: String,
  required: true,
  validate: {
    validator: function (v) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/.test(v);
    },
    message: props =>
      `Password must be at least 10 characters long and contain uppercase, lowercase, number, and special character.`
  }
},

  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Reject invalid emails and consecutive dots
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !v.includes("..");
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{8}$/.test(v);
      },
      message: props => `${props.value} must be an 8-digit phone number!`
    }
  },
  dateOfBirth: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(v);
      },
      message: props => `Date of birth must be in dd/mm/yyyy format!`
    }
  },
  companyName: {
    type: String,
    default: "IHRP",
    validate: {
      validator: function (v) {
        return v === "IHRP";
      },
      message: `Company name must be 'IHRP'`
    }
  },
  department: {
    type: String,
    required: true,
    enum: ["DTO", "P&A", "PPC", "Finance", "A&I", "Marketing"]
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "member"]
  }
}, {
  timestamps: true,
  versionKey: false
}

);
const bcrypt = require('bcryptjs');

// Hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});




module.exports = mongoose.model('User', userSchema);
