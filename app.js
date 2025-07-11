var createError = require("http-errors");
var express = require("express");
require("dotenv").config(); // Load env variables
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// Import the database connection
const db = require("./db");
const methodOverride = require("method-override");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const addressRoutes = require("./routes/address");
const readableAddressRoutes = require("./routes/readableAddress");
const loginRouter = require("./routes/login");
const registerRouter = require("./routes/register");
const logoutRouter = require("./routes/logout");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/swagger.yaml');


var app = express();

// Add the db instance to the app for later access
app.db = db;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");


app.use(express.urlencoded({ extended: true }));

// Esta função remove _method do req.body automaticamente
app.use(
  methodOverride((req, res) => {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));


app.use(
  session({
    store: new pgSession({
      pgPromise: db,
      createTableIfMissing: true 
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
      secure: false, 
      sameSite: 'lax'
    }
  })
);


app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api/address", addressRoutes);
app.use("/api/readable/address", readableAddressRoutes);
app.use("/login", loginRouter);
app.use("/register", registerRouter);
app.use("/logout", logoutRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
