const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./UserModel.js");
const Student = require("./StudentModel.js");
const Messages = require("./ChatModel.js");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const socketIo = require("socket.io");
require("dotenv").config();
app.use(express.json());

app.use(
  cors({
    origin: "https://crud-react-jemys3lrw-gleamsujeet001s-projects.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*", cors());

// Your other middleware and rout

const JWT_SECRET = process.env.JWT_SECRET;
const authenticateToken = require("./authMiddleware.js");

const userUploadDir = path.join(__dirname, "uploads");
const studentUploadDir = path.join(__dirname, "studpic");
if (!fs.existsSync(userUploadDir)) {
  fs.mkdirSync(userUploadDir, { recursive: true });
}
if (!fs.existsSync(studentUploadDir)) {
  fs.mkdirSync(studentUploadDir, { recursive: true });
}

app.use("/uploads", express.static(userUploadDir));
app.use("/studpic", express.static(studentUploadDir));

const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const userUpload = multer({ storage: userStorage });
const studentUpload = multer({ storage: studentStorage });

const PORT = process.env.PORT || 3939;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
server.on("error", (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message);
});

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // const userId = socket.handshake.query.userId;
  // console.log(userId, "user-online");

  socket.broadcast.emit("user-online");

  socket.on("typing", (data) => {
    socket.broadcast.emit("user-typing", data);
  });

  socket.on("message", (data) => {
    console.log("Message received:", data);
    socket.broadcast.emit("rec-message", data);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-offline");
    console.log("Client disconnected");
  });
});

// Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/learnMongoDB')
//   .then(() => {
//     console.log('Connected to MongoDB');
//   })
//   .catch((err) => {
//     console.error('Error connecting to MongoDB:', err);
//   });

mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB Atlas connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.post("/user-signup", userUpload.single("image"), async (req, res) => {
  try {
    const { name, username, contact, password } = req.body;

    // Save the relative path of the image
    const image = req.file ? `uploads/${req.file.filename}` : "";

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
      image,
    });

    await user.save();

    return res.status(200).json({
      message: "User registered successfully",
    });
  } catch (err) {
    return res.status(400).send("Error registering user: " + err.message);
  }
});

app.post("/user-login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      contact: user.contact,
      createdDate: user.createdDate,
    };

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/get-user-data", authenticateToken, async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/get-student-data", authenticateToken, async (req, res) => {
  try {
    const { parentsId } = req.body; // Extract parentsId from the request body

    // Find students where parentsId matches the provided parentsId
    const students = await Student.find({ parentsId: parentsId }).sort({
      _id: -1,
    });

    res.json(students); // Send the filtered students data to the frontend
  } catch (error) {
    console.error("Error fetching student data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put(
  "/update-user-data/:id",
  authenticateToken,
  userUpload.single("image"),
  async (req, res) => {
    try {
      const { name, username, contact } = req.body;

      // Construct the update data object
      const updateData = {
        name,
        username,
        contact,
      };

      // Only update the image if a new image is uploaded
      if (req.file) {
        updateData.image = `uploads/${req.file.filename}`;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user data", error });
    }
  }
);

app.put(
  "/update-student-data/:id",
  authenticateToken,
  studentUpload.single("profile"),
  async (req, res) => {
    try {
      const { fname, lname, email, mobile, gender, status, location } =
        req.body;
      const profile = req.file ? `studpic/${req.file.filename}` : "";

      const updateData = {
        fname,
        lname,
        email,
        mobile,
        gender,
        status,
        location,
      };

      if (profile) {
        updateData.profile = profile;
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({
        message: "Student updated successfully",
        student: updatedStudent,
      });
    } catch (error) {
      console.error("Error updating student data:", error);
      res.status(500).json({ message: "Error updating student data", error });
    }
  }
);

app.delete("/delete-student-data/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await Student.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/delete-user-data/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post(
  "/Add-student",
  authenticateToken,
  studentUpload.single("profile"),
  async (req, res) => {
    try {
      const {
        fname,
        lname,
        email,
        mobile,
        gender,
        status,
        location,
        parentsId,
      } = req.body;

      const profile = req.file ? `studpic/${req.file.filename}` : "";
      if (
        !fname ||
        !lname ||
        !email ||
        !mobile ||
        !gender ||
        !status ||
        !location ||
        !parentsId
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingStudent = await Student.findOne({ email });
      if (existingStudent) {
        return res.status(400).json({ message: "Student already exists" });
      }

      const newStudent = new Student({
        fname,
        lname,
        email,
        mobile,
        gender,
        status,
        location,
        profile,
        parentsId,
      });

      await newStudent.save();

      return res
        .status(201)
        .json({ message: "successfully", student: newStudent });
    } catch (error) {
      console.error("Error registering student:", error);
      return res
        .status(500)
        .json({ message: "Error registering student", error });
    }
  }
);

app.post("/user-change-password", authenticateToken, async (req, res) => {
  const { oldPassword, newPassword, userData } = req.body;
  try {
    const user = await User.findOne({ username: userData.email });
    // console.log(userData.email);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    // Compare the provided old password with the hashed password stored in the database
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    // Hash the new password before saving it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/add-msg", authenticateToken, async (req, res) => {
  // console.log(req.body);

  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (err) {
    console.log(err);
  }
});

app.post("/get-msg", authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });
    res.json(projectedMessages);
  } catch (err) {
    console.log(err);
  }
});

app.get("/chat-users/:id", authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } });
    return res.json(users);
  } catch (err) {
    console.log(err);
  }
});
