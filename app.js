const createError = require("http-errors");
const express = require("express");
require("dotenv").config(); // Load environment variables
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const methodOverride = require("method-override");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./docs/swagger.yaml");

const db = require("./db"); // Database connection

// Route imports
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const addressRoutes = require("./routes/address");
const readableAddressRoutes = require("./routes/readableAddress");
const loginRouter = require("./routes/login");
const registerRouter = require("./routes/register");
const logoutRouter = require("./routes/logout");
const mapRouter = require("./routes/map"); // ✅ Add your new map route here

const app = express();

// Add db instance to app
app.db = db;

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Middleware setup
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// HTTP method override support (e.g., PUT/DELETE in forms)
app.use(
  methodOverride((req, res) => {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// Session setup using PostgreSQL
app.use(
  session({
    store: new pgSession({
      pgPromise: db,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      secure: false,
      sameSite: "lax",
    },
  })
);

// Routes
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api/address", addressRoutes);
app.use("/api/readable/address", readableAddressRoutes);
app.use("/login", loginRouter);
app.use("/register", registerRouter);
app.use("/logout", logoutRouter);
app.use("/map", mapRouter); // ✅ Mount the new map route

// Swagger UI for API docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
