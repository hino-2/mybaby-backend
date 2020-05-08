if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express        = require('express')
const bcrypt         = require('bcrypt')
// const passport       = require("passport")
// const initPassport   = require('./passport-config')
// const flash          = require('express-flash')
// const session        = require('express-session')
const methodOverride = require('method-override')
const { v4: uuidv4 } = require('uuid')
// const path 			 = require('path')
const history        = require('connect-history-api-fallback')
const nodemailer     = require('nodemailer')
const ejs            = require('ejs')
const fs             = require('fs')

const app = express()

const mongoose = require('mongoose')
mongoose.connect(`mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@hino-2-cluster-yminm.mongodb.net/mybabyru?retryWrites=true&w=majority`, 
    { useNewUrlParser: true, useUnifiedTopology: true },
    err => err ? console.log(err) : console.log('connected') 
)

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    hashedPassword: String,
    babies: Array,
    gender: String,
    money: Number
})

const users = new mongoose.model('user', userSchema)

// initPassport(
//     passport, 
//     email => users.findOne({ email: email }),
//     id => users.findOne({ id: id })
// )

const transporter = nodemailer.createTransport({
    service: 'Mail.ru',
    auth: {
        user: 'info-corona@mail.ru',
        pass: 'coronavirusshop'
    }
})

app.use(history(/*{logger: console.log.bind(console)}*/))
app.use("/", express.static(__dirname + '/'))
app.use("/static", express.static(__dirname + '/static'))
app.use("/img", express.static(__dirname + '/img'))
app.use(express.urlencoded({ extended: false }))
// app.use(flash())
// app.use(session({
//     genid: () => uuidv4(),
//     secret: 'process.env.SESSION_SECRET',
//     resave: false,
//     saveUninitialized: false
// }))
// app.use(passport.initialize())
// app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.json())

app.post('/register', async (req, res) => {
    users.findOne({ email: req.body.email }, async (error, result) => {
        // не нашел: result === null
        // нашел:    result === document
        if(error) return res.status(500).send({result: "cant connect to MongoDB", error: error})
        if(result) return res.send({result: "existing email"})

        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10)
            const newUser = users({
                name: req.body.name,
                email: req.body.email,
                hashedPassword: hashedPassword,
                gender: req.body.gender,
                babies: [],
                money: 0
            })

            newUser.save((error, result) => {
                if(error) return res.status(500).send({result: "cant save to MongoDB", error: error})
                res.send({result: "success"})
            })
        } catch (error) {
            console.log(error)
            res.status(500).send({result: "fail", error: error})
        }
    })
})

app.post('/login', async (req, res) => {
    try {
        const user = await users.findOne({ email: req.body.email }).exec()
        // console.log(user)
        if(!user) return res.status(400).send({result: null})

        if(!bcrypt.compareSync(req.body.password, user.hashedPassword))
            return res.status(401).send({result: "wrong password"})

        res.status(200).send(user)
    } catch (error) {
        console.log(`catched error: ${error}`)
        res.send({error: error})
    }
})

app.post('/registerOrder', (req, res) => {
    const orderID = uuidv4()
    req.body.order.orderID = orderID
    orders.push(req.body.order)
    res.send(JSON.stringify({orderID: orderID}))

    if(req.body.order.userID) {
        req.body.order.userName = users.find(user => user.id === req.body.order.userID).name
        const mailOptions = {
            from: 'info-corona@mail.ru',
            to: users.find(user => user.id === req.body.order.userID).email,
            subject: `Ваш заказ № ${orderID} зарегистрирован // Шестой русский магазин КОРОНА`,
            html: ejs.render(fs.readFileSync('./templates/email.ejs', {encoding:'utf-8'}), req.body.order)
        }
        
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
            console.log(error);
            } else {
            console.log('Email sent: ' + info.response);
            }
        })
    }
})

app.post('/getOrders', (req, res) => {
    if(req.body.userID)
        res.send(JSON.stringify(
            orders.filter(
                order => order.userID === req.body.userID
            ))
        )
    else
        res.send(JSON.stringify([]))
})

app.delete('/logoutUser', (req, res) => {
    // зачем??
    if(req.body.userID === undefined) 
        return res.sendStatus(403);

    const user = users.find(user => user.id === req.body.userID)
    user.isLoggedIn = false
    
    req.logOut()
    res.send(JSON.stringify({result: "success"}))
})

app.post('/addMoney', (req, res) => {
    let user = users.find(user => user.id === req.body.userID)

    if(!user) {
        res.send(JSON.stringify({
            result: 'no user specified'
        }))
        return
    }

    user.saldo += parseInt(req.body.amount)
    res.send(JSON.stringify({
        result: 'money added'
    }))
})

app.get('/users', (req, res) => {
    // обязательно в запросе !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! :
    // Accept: application/json
    users.find({}, (err, users) => {
        if (err) return console.error(err)
        res.send(users)
    })
})

app.listen(process.env.PORT || 8080)





