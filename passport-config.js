const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initPassport(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail(email)
        if(!user) 
            return done(null, false, { message: 'No user' })

        try {
            if(await bcrypt.compare(password, user.password)) {
            // if(password === user.password) {
                return done(null, user)
            } else {
                return done(null, false, { message: 'Wrong password' })
            }
        } catch (error) {
            return done(error)
        }
    }
    passport.use(new LocalStrategy(
        { usernameField: 'email' },
        authenticateUser
    ))
    passport.serializeUser((user, done) => {
        done(null, user.id)
    })
    passport.deserializeUser((id, done) => {
        done(null, getUserById(id))
    })
}

module.exports = initPassport