const prisma = require("../models/prisma");
const fs = require("fs/promises");
const { upload } = require("../config/cloudinaryService");
const createError = require("../utils/create-error");
const { checkReviewIdSchema } = require("../validators/review-validator");

exports.createReview = async (req, res, next) => {
  try {
    const { reviewMessage } = req.body;
    if ((!reviewMessage || !reviewMessage.trim()) && !req.file) {
      return next(createError("Review or Image is required", 400));
    }

    const data = { customerId: req.customer.id };
    if (req.file) {
      data.image = await upload(req.file.path);
    }
    if (reviewMessage) {
      data.reviewMessage = reviewMessage;
    }
    const review = await prisma.review.create({
      data: data,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImg: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            restaurantName: true,
          },
        },
      },
    });

    const reviewImage = [];
    if (req.files) {
      const image = await prisma.reviewImage.create({
        data: {
          reviewId: review.id,
        },
      });
    }

    res.status(201).json({ message: "Review created", review });
  } catch (err) {
    next(err);
  } finally {
    if (req.file) {
      fs.unlink(req.file.path);
    }
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { value, error } = checkReviewIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }

    const existReview = await prisma.review.findFirst({
      where: {
        id: value.reviewId,
        customerId: req.customer.id,
      },
    });

    if (!existReview) {
      return next(createError("Unable to delete this review", 400));
    }
    await prisma.review.delete({
      where: {
        id: existReview.id,
      },
    });
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
