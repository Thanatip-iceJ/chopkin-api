const express = require("express");
const morgan = require("morgan");
require("dotenv").config();
const http = require("http");
const cors = require("cors");
const app = express();

const restaurantRoute = require("../src/routes/restaurant-route");
const chatRoute = require("../src/routes/chat-route");
const notFoundMiddleware = require("../src/middleware/notFoundMiddleware");
const errorMw = require("../src/middleware/errorMiddleware");
const authRoute = require("../src/routes/auth-route");
const packageRoute = require("../src/routes/package-route");
const reviewRoute = require("./routes/review-route");
const bookingRoute = require("./routes/booking-route");
const paymentRoute = require("./routes/payment-route");
const googleRoute = require("./routes/google-route");
const customerRoute = require('./routes/customer-route');
const Chat = require("./chatSocketIo/Chat");


app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static("public"));


app.use("/restaurant", restaurantRoute);
app.use("/chat", chatRoute);
app.use("/package", packageRoute);
app.use("/auth", authRoute);
app.use('/review', reviewRoute);
app.use("/booking",bookingRoute);
app.use("/payment",paymentRoute);
app.use("/google", googleRoute);
app.use('/customer', customerRoute)
app.use("/chat",chatRoute);

app.use(notFoundMiddleware);
app.use(errorMw);

const server = http.createServer(app);
Chat(server);

const port = process.env.PORT || 8000;
server.listen(port, () => console.log("server is running on port", port));
