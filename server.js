
require("dotenv").config();

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", require("./routes/index"));
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

console.log('====================================');
console.log("testing : ");
console.log('====================================');
app.use((error, req, res, next) => {
  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.message ||
      "Something went wrong",

    data: {},

    error,
  });
});



app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
