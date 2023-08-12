// const { HttpError } = require("../helpers/HttpError");
const { schemas, User } = require('../models/user')
const jwt = require('jsonwebtoken')
// для верификации
const { nanoid } = require('nanoid')
// функция для отправки принимает данные + from

const { sendEmail } = require('../helpers')
// пакет для хеширования пароля
const bcrypt = require('bcrypt')
// для временной аватарки пакет при 1 регистрации
const gravatar = require('gravatar')
// используем fs для перемещения
const fs = require('fs/promises')
const path = require('path')
// для работы с изображениями jimp & fs-extra
const jimp = require('jimp')
// const fsExtra = require('fs-extra');

const { SECRET_KEY, BASE_URL } = process.env

// путь для аватар переноса(сохранения)
const avatarDir = path.join(__dirname, '../', 'public', 'avatars')

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

    // создаем verification code для подтверждения регистрации по email
    const verificationToken = nanoid()

    // передаем email человека и мы получаем аватар временную(первоначальную) каждому при регистрации
    const avatarURL = gravatar.url(email)

    // Создаем нового пользователя в базе данных с verificationToken
    const newUser = await User.create({
      ...req.body,
      password: hashPassword,
      avatarURL,
      verificationToken
    })

    // create verify email создали

    const verifyEmail = {
      to: email,
      subject: 'Verify email',
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click to verify email</a>`
    }

    try {
      await sendEmail(verifyEmail)
      console.log('Email sent successfully!')
    } catch (error) {
      console.error('Error sending email:', error)
    }

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

const verify = async (req, res) => {
  const { verificationToken } = req.params
  // посмотреть есть ли стаким кодом в базе
  const user = await User.findOne({ verificationToken })
  try {
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: 'Verification has already been passed' })
    }

    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null
    })

    res.status(200).json({ message: 'Verification successful' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// для повторной отправки email , если не получил верификацию
const resendVerify = async (req, res) => {
  const { email } = req.body
  // смотрим есть ли в базе такой email
  try {
    // Проверка валидности email с использованием emailSchema
    const { error } = schemas.emailSchema.validate({ email })

    if (error) {
      return res.status(400).json({ message: 'missing required field email' })
    }

    const user = await User.findOne({ email })
    // если такого нет пользователя с таким email
    if (!user) {
      return res.status(404).json({ message: 'User not found ' })
    }
    // если подтвердил ранее уже
    if (user.verify) {
      return res
        .status(400)
        .json({ message: 'Verification has already been passed' })
    }

    // create verify email создали

    const verifyEmail = {
      to: email,
      subject: 'Verify email',
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${user.verificationToken}">Click to verify email</a>`
    }

    // отправляем verify email

    await sendEmail(verifyEmail)

    res.status(200).json({ message: 'Verification email sent' })
  } catch (error) {
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

    // если не подтвердил email нельзя залогинится
    if (!user.verify) {
      return res.status(401).json({ message: 'No verify' })
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

const updateAvatar = async (req, res) => {
  const { _id } = req.user

  // Проверяем наличие файла в запросе, если нет - ошибку выводим/
  if (!req.file) {
    return res.status(400).json({ message: 'Avatar file is missing' })
  }

  // импортируем путь и название
  const { path: tempUpload, originalname } = req.file

  // Путь для временного хранения загруженного файла в папке 'temp'
  const tempPath = path.join(__dirname, '../', 'temp', originalname)

  // Читаем изображение с использованием jimp
  const image = await jimp.read(tempUpload)

  // Изменяем размер изображения до 250x250
  await image.resize(250, 250)

  // Добавляем уникальность имени с помощью добавления идентификатора пользователя + название файла
  const filename = `${_id}_${originalname}`

  // Итоговый путь сохранения файла с уникальным именем в папке 'public/avatars'
  const resultUpload = path.join(avatarDir, filename)

  // Сохраняем измененное изображение в папку 'public/avatars'
  await image.writeAsync(resultUpload)

  // Удаляем временный файл из папки 'temp'
  await fs.unlink(tempPath)

  // Записываем новый путь в базу. Получаем идентификатор и отправляем новый путь к avatarURL
  const avatarURL = path.join('avatars', filename)
  await User.findByIdAndUpdate(_id, { avatarURL })

  // Отправляем URL аватара в ответе
  res.json({ avatarURL })
}

module.exports = {
  register,
  login,
  getCurrent,
  logout,
  updateAvatar,
  verify,
  resendVerify
}
