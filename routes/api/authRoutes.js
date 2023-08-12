// authRoutes.js
const express = require('express')
const authController = require('../../controllers/authController')

const { authenticate, upload } = require('../../middlewares/index');

const router = express.Router()

// При роуте используем схему и при выполнении используем контролер authController.register
router.post('/register', (req, res) => {
  authController.register(req, res)
})

// Login  http://localhost:3000/api/auth/login получаем токен

router.post('/login', (req, res) => {
  authController.login(req, res)
})

// маршрут current для возобновления токена пишем путь

router.get('/current', authenticate, authController.getCurrent)

// роут для подтверждения верификации по email

router.get('/verify/:verificationToken', authController.verify)

// для повторной отправки кода верификации если email не пришёл 1 раз

router.post('/verify', authController.resendVerify)

// маршрут для logout
router.post('/logout', authenticate, (req, res) => {
  authController.logout(req, res)
})

// upload.single('avatar') для перенесения в папку public
router.patch('/avatars', authenticate, upload.single('avatar'), (req, res) => {
  authController.updateAvatar(req, res);
});

module.exports = router
