const prisma = require("../models/prisma");
const createError = require("../utils/create-error");
const paymentMiddleware = require("../middleware/paymentMiddleware");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

// const SUCCESS_URL = "http://localhost:5173/success/";
const SUCCESS_URL = "http://localhost:5173/payment/success/";
const CANCLE_URL = "http://localhost:5173/profile/"

//stripe

//post
//req bookingId
//img
const checkoutBooking = async(req,res,next)=>{
    try{
        const bookingId = req.body.bookingId;

        const booking = await findBookingById(bookingId,next);  //search booking
        if(!booking){
            return next(createError("not found this bookingId",404));
        }        
        
        const package = await findPackageById(booking.packageId);//find package
        if(!package)return next(createError("not found this package id",404));

        //stripe
        const session = await stripe.checkout.sessions.create({
            mode:"payment",
            line_items:[{
                price_data:{
                    currency:"thb",
                    unit_amount:package.price*100,//for convert decimal
                    product_data:{
                        name:package.name,
                        images:[package?.img||"https://domf5oio6qrcr.cloudfront.net/medialibrary/6372/202ebeef-6657-44ec-8fff-28352e1f5999.jpg"],//mockup images
                    },
                },
                quantity:1,
            }],
            // success_url:"https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.jurds.com.au%2Fwhat-defines-success%2F&psig=AOvVaw1FNfLZd9eNU0f4fxxL9yq9&ust=1699682439673000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCIiH0dLguIIDFQAAAAAdAAAAABAE",
            success_url:SUCCESS_URL+booking.paymentId,
            cancel_url:CANCLE_URL+booking.customerId
            // cancel_url:"https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.hostinger.com%2Ftutorials%2Fhow-to-fix-error-404&psig=AOvVaw0eaVIbxPEGuxtUPOSJEzQV&ust=1699682415739000&source=images&cd=vfe&ved=0CBIQjRxqFwoTCMCh9MbguIIDFQAAAAAdAAAAABAE",
        });
        
        //==stripe
        // console.log(session.url);
        res.send({url:session.url,paymentId:booking.paymentId});
    }
    catch(error){
        next(error);
    }
}
//stripe

//front call on useEffect (success)
//if req.body.paymentStatus = null =>0
const updatePaymentByPaymentId =async(req,res,next)=>{
    try{
        const paymentId = req.body.paymentId;
        const paymentStatus = req.body.paymentStatus||0;
        const updatePayment = await paymentMiddleware.updatePayment(paymentId,paymentStatus,next);
        
        if(!updatePayment){
            return next(createError("not found this payment",404));
        }

        res.status(200).json({message:"update success",updatePayment});
        
    }catch(error){
        next(error);
    }
}

//#region bookingMiddleware
const findBookingById = async(bookingId,next)=>{
    try {
        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId
            }
        });
        return booking;
    }
    catch (error) {
        return null;
    }
}
const findPackageById = async(packageId,next)=>{
    try{
        const package = await prisma.package.findFirst({
            where:{
                id:packageId
            }
        });
        return package;
    }
    catch(error){
        return null;
    }
}
//#endregion

//get
const getPaymentByBookingId = async(req,res,next)=>{
    try{
        const bookingId = req.params.bookingId;

        const booking  = await prisma.booking.findFirst({
            where:{
                id:bookingId
            },
            include:{
                payment:true
            }
        });

        if(!booking){
            return next(createError("dont have this bookingId"));
        }

        res.status(200).json({message:"get payment",booking});
    }
    catch(error){
        next(error);
    }
}



//delete cascade

exports.getPaymentByBookingId = getPaymentByBookingId;
exports.checkoutBooking = checkoutBooking;
exports.updatePaymentByPaymentId = updatePaymentByPaymentId;
