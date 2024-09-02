const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./UserModel.js');
const Student = require('./StudentModel.js');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
app.use(express.json());
app.use(cors());

// Ensure directories exist
const userUploadDir = path.join(__dirname, 'uploads');
const studentUploadDir = path.join(__dirname, 'studpic');
if (!fs.existsSync(userUploadDir)) {
  fs.mkdirSync(userUploadDir, { recursive: true });
}
if (!fs.existsSync(studentUploadDir)) {
  fs.mkdirSync(studentUploadDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(userUploadDir));
app.use('/studpic', express.static(studentUploadDir));

// Multer storage configurations
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Multer instances
const userUpload = multer({ storage: userStorage });
const studentUpload = multer({ storage: studentStorage });

// Start the server
const PORT = process.env.PORT || 3939;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
server.on('error', (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message);
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/learnMongoDB')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// User Signup
app.post('/user-signup', userUpload.single('image'), async (req, res) => {
  try {
    const { name, username, contact, password } = req.body;

    // Save the relative path of the image
    const image = req.file ? `uploads/${req.file.filename}` : '';

    if ([name, username, contact, password].some((field) => field === "")) {
      return res.status(400).send("All fields are required");
    }

    let existedUser = await User.findOne({ username });
    if (existedUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      username,
      contact,
      password: hashedPassword,
      createdDate: new Date(),
      image
    });

    await user.save();

    return res.status(200).json({
      message: "User registered successfully",
    });
  } catch (err) {
    return res.status(400).send("Error registering user: " + err.message);
  }
});


// User Login
app.post('/user-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Remove sensitive information before sending the response
    const userWithoutPassword = {
      _id: user._id,
      username: user.username,
      email: user.email,
      image: user.image,
      // add other user fields here
    };

    // Generate JWT token (optional, if needed in the future)
    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    //   expiresIn: '1h', // Token expires in 1 hour
    // });

    // Send user data
    res.json({ message: 'Login successful', user: userWithoutPassword });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User Data
app.get('/get-user-data', async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/get-student-data', async (req, res) => {
  try {
    const users = await Student.find().sort({ _id: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Update User Data
app.put('/update-user-data/:id', userUpload.single('image'), async (req, res) => {
  try {
    const { name, username, contact } = req.body;
    const image = req.file ? req.file.path : null;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        username,
        contact,
        image
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user data', error });
  }
});
app.put('/update-student-data/:id', studentUpload.single('profile'), async (req, res) => {
  try {
    const { fname, lname, email, mobile, gender, status, location } = req.body;
    const profile = req.file ? req.file.path : null;

    // Find and update the student by ID
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        fname,
        lname,
        email,
        mobile,
        gender,
        status,
        location,
        ...(profile && { profile }) // Only update profile if a new file was uploaded
      },
      { new: true } // Return the updated document
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully', student: updatedStudent });
  } catch (error) {
    console.error('Error updating student data:', error);
    res.status(500).json({ message: 'Error updating student data', error });
  }
});

// Delete User Data
app.delete('/delete-student-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await Student.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/delete-user-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await User.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Add Student
app.post('/Add-student', studentUpload.single('profile'), async (req, res) => {
  try {
    const { fname, lname, email, mobile, gender, status, location } = req.body;

    const profile = req.file ? `studpic/${req.file.filename}` : '';
    if (!fname || !lname || !email || !mobile || !gender || !status || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    const newStudent = new Student({
      fname,
      lname,
      email,
      mobile,
      gender,
      status,
      location,
      profile
    });

    await newStudent.save();

    return res.status(201).json({ message: 'successfully', student: newStudent });
  } catch (error) {
    console.error('Error registering student:', error);
    return res.status(500).json({ message: 'Error registering student', error });
  }
});
