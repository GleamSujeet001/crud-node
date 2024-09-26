const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  contact: { type: Number, required: true },
  password: { type: String, required: true },
  createdDate: { type: Date, required: true },
  image: { type: String },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
