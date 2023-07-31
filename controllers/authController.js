// const { HttpError } = require("../helpers/HttpError");
const { schemas, User } = require('../models/user')
const jwt = require('jsonwebtoken')
// пакет для хеширования пароля
const bcrypt = require('bcrypt')

const { SECRET_KEY } = process.env

const register = async (req, res) => {
  try {
    // Получаем данные пользователя из тела запроса
    const { email, password } = req.body

    // перед регистрацией смотрим, есть ли уже пользователь с таким email
    const user = await User.findOne({ email })

    // если есть пользователь с таким email, выводим сообщение "Email already in use"
    if (user) {
      return res.status(409).json({ message: 'Email in use' })
    }

    // Проверяем, что данные соответствуют схеме
    const { error } = schemas.registerSchema.validate({ email, password })

    if (error) {
      // Проверяем, какое поле не хватает или не соответствует требованиям
      let errorMessage = error.details[0].message

      if (errorMessage.includes('"email"')) {
        errorMessage = 'Invalid email format'
      } else if (errorMessage.includes('"password"')) {
        errorMessage = 'Password must be at least 6 characters long'
      }

      return res.status(400).json({ message: errorMessage })
    }

    const hashPassword = await bcrypt.hash(password, 10)

    // Создаем нового пользователя в базе данных
    const newUser = await User.create({ ...req.body, password: hashPassword })

    // Отправляем успешный ответ с данными о новом пользователе и статусом 201
    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription
      }
    })
  } catch (error) {
    // В случае ошибки логируем ее и отправляем ответ с кодом 500 и сообщением об ошибке
    res.status(500).json({ message: 'Server error' })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' })
    }

    // перед залогинится смотрим, есть ли уже пользователь с таким email
    const user = await User.findOne({ email })

    // если пользователя по email не находит - ошибка
    if (!user) {
      return res.status(401).json({ message: 'Email or password is wrong' })
    }

    // если есть пользователь в базе по email, сравниваем пароль с хешем
    const comparePassword = await bcrypt.compare(password, user.password)

    if (!comparePassword) {
      return res.status(401).json({ message: 'Email or password is wrong' })
    }

    // создаем токен payload данные user
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email
    }

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '23h' })

    // сохраняем при login наш login  для последующего logout
    await User.findByIdAndUpdate(user._id, { token })

    // отправляем ответ с данными о пользователе, токеном и статусом 200
    res.status(200).json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription
      }
    })
  } catch (error) {
    // В случае ошибки логируем ее и отправляем ответ с кодом 500 и сообщением об ошибке
    res.status(500).json({ message: 'Server error' })
  }
}

// получаем email, subscription из req.user и отправляем их
const getCurrent = async (req, res) => {
  const { email, subscription } = req.user
  res.json({ email, subscription })
}

const logout = async (req, res) => {
  const { _id } = req.user
  // при logout делаем token: ""
  await User.findByIdAndUpdate(_id, { token: '' })
  res.status(204).end()
  //   res.json({message: "Logout success"})
}

module.exports = {
  register,
  login,
  getCurrent,
  logout
}