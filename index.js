
const express =require('express')
const mongoose=require('mongoose')
const cors =require('cors')
const User =require('./UserModel.js')
const app =express();
const jwt = require('jsonwebtoken');
const bcrypt =require('bcryptjs')
const multer =require('multer')
const path =require('path')

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

require('dotenv').config();
app.use(express.json())
app.use(cors());
// Start the server
const PORT = process.env.PORT || 3000;
const server=app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
server.on('error', (err) => {
    console.error(`Failed to start server on port ${PORT}:`, err.message);
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/learnMongoDB')
    .then(() => {
        console.log('Connected to MongoDB Server');
})
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

app.post('/user-signup', upload.single('image'), async (req, res) => {
    try {
        const {  name,username,contact, password } = req.body;
        const image = req.file ? req.file.path : '';
        if ([   name, username,contact, password].some((field) => field === "")) {
          return res.status(400).send("all fields are required : " + err.message);
        }
        let existedUser = await User.findOne({ username });
        if (existedUser) {
          return res.status(400).json({ message: "User already exists" });
        }
           // Hash the password
           const salt = await bcrypt.genSalt(10); // 10 is the salt rounds, you can adjust this value for security vs performance
           const hashedPassword = await bcrypt.hash(password, salt);

               const user = new User({ name, username, contact, password: hashedPassword,createdDate:new Date(),image });
        await user.save();

        return res.status(200).json({  
          message: "User registered successfully",
        });
      } catch (err) {
        return res.status(400).send("Error registering user: " + err.message);
      }
});

app.post('/user-login', async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);
  
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(password,user.password,isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
      
    }

    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    //   expiresIn: '1h', // Token expires in 1 hour
    // });
    res.json('sucess');

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/get-user-data', async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
      // console.log(users);
      res.json(users)
  } catch (error) {
      // console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.put('/update-user-data/:id', upload.single('image'), async (req, res) => {
  try {
    // Extract updated data
    const { name, username, contact } = req.body;
    const image = req.file ? req.file.path : null;  // Use image path if file is uploaded

    // Find the user by ID and update with new data
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

app.delete('/delete-user-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(req.params);
    
    await User.findByIdAndDelete(id); // Delete the document by ID
    res.status(204).send(); // Send no content response
  } catch (error) {
    // console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


