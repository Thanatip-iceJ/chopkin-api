const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { registerSchema, loginSchema } = require("../validators/auth-validator");
const prisma = require("../models/prisma");
const createError = require("../utils/create-error");
require("dotenv");

//email Or phone

// model Customer {
//   id          String     @id
//   firstName   String
//   lastName    String
//   profileImg  String?
//   memberPoint Int
//   email       String     @unique
//   phone       String     @unique
//   password    String
//   Bookings    Booking[]
//   Reviews     Review[]
//   ChatRooms   ChatRoom[]
// }

// model Admin {
//   id        String     @id
//   isAdmin   Int        @default(1)
//   email     String     @unique
//   password  String
//   ChatRooms ChatRoom[]
// }

// model Restaurant {
//   id                    String                  @id
//   restaurantName        String                  @unique
//   ownerFirstName        String
//   ownerLastName         String
//   email                 String                  @unique
//   phone                 String                  @unique
//   password              String                  @default("1234")
//   profileImg            String?
//   latitude              String?
//   longitude             String?
//   price                 String
//   categoryIndex         Int
//   districtIndex         Int?
//   nationIndex           Int
//   status                Int                     @default(0)
//   Bookings              Booking[]
//   Reviews               Review[]
//   RestaurantImages      RestaurantImage[]
//   Packages              Package[]
//   BusinessTime          BusinessTime[]
//   RestaurantPendingEdit RestaurantPendingEdit[]
// }

//check Param
const register = async (req, res, next) => {
  try {
    const { usertype } = req.params;
    console.log(req.params);
    if (usertype == "customer") return CustomerRegister(req, res, next);
    else if (usertype == "restaurant") return CreateRestaurants(req, res, next);
    res.status(404).json({ message: "not found" });
  } catch (error) {
    next(error);
  }
};
const createAdmin = async (req, res, next) => {
  try {
    //validate

    //validate
    const adminData = req.body;
    adminData.password = await bcrypt.hash(adminData.password, 12);

    const newAdmin = await prisma.admin.create({
      data: {
        email: adminData.email,
        password: adminData.password,
      },
    });

    const payload = { adminId: newAdmin.id };
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res.status(200).json({ message: "create admin", accessToken, newAdmin });
  } catch (error) {
    next(error);
  }
};

const CreateRestaurants = async (req, res, next) => {
  try {
    //validate

    //validate
    const data = req.body;
    // const {
    //   restaurantName,
    //   ownerFirstName,
    //   ownerLastName,
    //   email,
    //   phone,
    //   categoryIndex,
    //   nationIndex,
    //   districtIndex,
    //   price,
    //   position,
    // } = data;
    if (data.password != data.confirmPassword) {
      return next(createError("password not match", 400));
    }
    const checkRestaurants = await prisma.restaurant.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });
    const checkCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (checkRestaurants || checkCustomer) {
      return next(createError("have this email and password", 400));
    }
    //1234 default password
    data.password = await bcrypt.hash("1234", 12);
    console.log(data.password);

    const newRestaurants = await prisma.restaurant.create({
      data: {
        restaurantName: data.restaurantName,
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        email: data.email,
        phone: data.phone,
        latitude: +data.position.lat,
        longitude: +data.position.lng,
        price: +data.price,
        password: data.password,
        categoryIndex: data.categoryIndex,
        districtIndex: data.districtIndex,
        nationIndex: data.nationIndex,
      },
    });

    const payload = { restaurantId: newRestaurants.id };
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      message: "create restaurants success",
      accessToken,
      newRestaurants,
    });
  } catch (error) {
    next(error);
  }
};

const CustomerRegister = async (req, res, next) => {
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) {
      next(error);
      return;
    }
    const checkRestaurants = await prisma.restaurant.findFirst({
      where: {
        OR: [{ email: value.email }, { phone: value.phone }],
      },
    });
    const checkCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: value.email }, { phone: value.phone }],
      },
    });

    if (checkRestaurants || checkCustomer) {
      return next(createError("have this email and password", 400));
    }

    //hash password
    value.password = await bcrypt.hash(value.password, 12);

    //create
    const customer = await prisma.customer.create({
      data: {
        firstName: value.firstName,
        lastName: value.lastName,
        // memberPoint: 0,
        email: value.email,
        phone: value.phone,
        password: value.password,
        profileImg: value.profileImg,
      },
    });

    const payload = { customerId: customer.id };
    //accessToken
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );

    delete customer.password;
    res
      .status(200)
      .json({ message: "Create customer success", accessToken, customer });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = req.body;
    const checkRestaurants = await prisma.restaurant.findFirst({
      where: {
        OR: [{ email: data.emailOrPhone }, { phone: data.emailOrPhone }],
      },
    });

    if (checkRestaurants)
      return restaurantLogin(data, checkRestaurants, res, next);

    const checkCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: data.emailOrPhone }, { phone: data.emailOrPhone }],
      },
    });

    if (checkCustomer) return customerLogin(data, checkCustomer, res, next);

    const checkAdmin = await prisma.admin.findFirst({
      where: {
        email: data.emailOrPhone,
      },
    });
    if (checkAdmin) return adminLogin(data, checkAdmin, res, next);

    // if(checkRestaurants)restaurantLogin(req,res,next);
    // // else if(checkCustomer)customerLogin(req,res,next);
    // else if(checkAdmin)adminLogin(req,res,next);
    res.status(404).json({ message: "not found this user" });
  } catch (error) {
    next(error);
  }
};
const customerLogin = async (data, customer, res, next) => {
  try {
    const passwordCheck = await bcrypt.compare(
      data.password,
      customer.password
    );
    if (!passwordCheck) {
      return next(createError("password not match", 400));
    }
    const payload = { customerId: customer.id };
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res.status(200).json({ message: "customer Login", accessToken, customer });
  } catch (error) {
    next(error);
  }
};
const adminLogin = async (data, admin, res, next) => {
  try {
    const passwordCheck = await bcrypt.compare(data.password, admin.password);
    console.log(admin.password);
    if (!passwordCheck) {
      return next(createError("password not match", 400));
    }
    const payload = { adminId: admin.id };
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res.status(200).json({ message: "admin Login", accessToken, admin });
  } catch (error) {
    next(error);
  }
};

const restaurantLogin = async (data, restaurant, res, next) => {
  try {
    const passwordCheck = await bcrypt.compare(
      data.password,
      restaurant.password
    );
    console.log(restaurant.password);
    // const passwordCheck = data.password === restaurant.password

    if (!passwordCheck) {
      return next(createError("password not match", 400));
    }
    const payload = { restaurantId: restaurant.id };
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || "8JncnNqEPncnca7ranc47anda",
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res
      .status(200)
      .json({ message: "restaurant Login", accessToken, restaurant });
  } catch (error) {
    next(error);
  }
};

const getUser = (req, res, next) => {
  return res.status(200).json({ user: req.user });
};

exports.register = register;
exports.createAdmin = createAdmin;
exports.login = login;
exports.getUser = getUser;
