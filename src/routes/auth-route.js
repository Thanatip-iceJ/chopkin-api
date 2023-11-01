const express = require('express')
const authController = require("../controllers/auth-controller")

const router = express.Router()

// router.post('/login', authController.login)
router.post('/register/:usertype', authController.register);
router.post('/register/admin', authController.createAdmin);
router.post('/login', authController.login);

module.exports = router