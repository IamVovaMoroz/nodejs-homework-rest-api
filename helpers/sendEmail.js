const nodemailer = require('nodemailer')
require('dotenv').config()

const { UKR_NET_EMAIL, UKR_NET_PASSWORD } = process.env

// создать транспорт и обьект настроек
// npm i nodemailer  установить

const nodemailerConfig = {
    host: "smtp.ukr.net",
    port: 465,
    secure: true, 
    auth: {
user:  UKR_NET_EMAIL, pass: UKR_NET_PASSWORD
    }

}

const transport = nodemailer.createTransport(nodemailerConfig)

// для отправки сообщений функция
// const data = {

//     to: "jasam64420@viperace.com",
//     subject: "Verify email",
//     html: "<p>Verify email UKR</p>"
// }

const sendEmail = async (data) =>{
    const email = {...data, from: UKR_NET_EMAIL }
    await transport.sendMail(email)
    return true
}

module.exports = sendEmail
