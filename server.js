// const app = require('./app')

// app.listen(3000, () => {
//   console.log("Server running. Use our API on port: 3000")
// })

// импортируем mongoose
const mongoose = require("mongoose")

const app = require('./app')



// подключаем по ссылке с mongoDB
const DB_HOST = "mongodb+srv://VolodymyrM:NOni01041983@cluster0.ls7r7f1.mongodb.net/db-contacts"
// при обновлении чтобы не скинуло
mongoose.set('strictQuery', true)

// запуск сервера после успешно подсоединения к dataBase
mongoose.connect(DB_HOST).then(() => {
  console.log("Database connection successful");
  app.listen(3000)
})
.catch(error => {
  console.log("Database connection error:", error.message);
  // останавливает запущенный процесс в случае ошибки
  process.exit(1)
} )

