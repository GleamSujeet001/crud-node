const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  gender: { type: String, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  profile: { type: String, required: true }, // Path to the image file
  createdDate: { type: Date, default: Date.now },
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
