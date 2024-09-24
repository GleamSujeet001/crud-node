const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  gender: { type: String, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  profile: { type: String }, 
  parentsId: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
