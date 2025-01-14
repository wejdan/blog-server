require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const socketIo = require("socket.io");
const session = require("express-session");

// Utility and database connections
const connectDatabase = require("./utils/database");
const passport = require("./config/passport-config"); // Adjust the path based on your structure
// Models

// Routes
const postsRoutes = require("./routes/postsRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/UserRoutes");
const storageRoutes = require("./routes/storageRoutes");
const allCommentsRoutes = require("./routes/allCommentsRoutes");

// Error handling
const {
  notFoundError,
  globalErrorHandler,
} = require("./controllers/error-controller");
const { handleOAuthSuccess } = require("./middleware/check-auth");

const app = express();
app.use(cors({ credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ limit: "2mb", extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "your_secret", // This should be a long, random string to keep sessions secure
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      httpOnly: true, // Prevents client side JS from reading the cookie
      secure: false, // true if using https
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1/posts", postsRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/storage", storageRoutes);
app.use("/api/v1/comments", allCommentsRoutes);

// Google Auth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  handleOAuthSuccess
);

// Error handling
app.use(notFoundError);
app.use(globalErrorHandler);

const server = http.createServer(app); // Create an HTTP server from the Express app

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust the port if your client is served from another port
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
}); // Attach Socket.IO to the server
const PORT = process.env.PORT || 5000;

require("./socketApp/socketController")(io);

connectDatabase()
  .then(() => {
    // Optional: Scheduled tasks or additional setup before starting the server
    require("./scheduledTasks");

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Optional: indexPermanentImagesInDatabase();
    });
  })
  .catch((err) => {
    console.error("Database connection failed. Server not started.", err);
    process.exit(1);
  });
