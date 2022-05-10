const express = require('express')

require('dotenv').config()
const app = express()
const port = process.env.PORT || 8080

const session = require('express-session')
const { ExpressOIDC } = require('@okta/oidc-middleware')

app.use(session({
    secret: process.env.APP_SECRET,
    resave: true,
    saveUninitialized: false
}))

const oidc = new ExpressOIDC({
    issuer: `${process.env.OKTA_ORG_URL}`,
    client_id: process.env.OKTA_CLIENT_ID,
    client_secret: process.env.OKTA_CLIENT_SECRET,
    redirect_uri: `${process.env.HOST_URL}/authorization-code/callback`,
    scope: 'openid email profile'
})

app.use(oidc.router)

app.get('/auth/info', (req, res) => { 
    res.send(`Application is working fine - redirect URI: ${process.env.HOST_URL}/authorization-code/callback *** OKTA_ORG_URL: ${process.env.OKTA_ORG_URL}`);
})

app.get('/auth/verify/:token', (req, res) => {
    res.send(`TODO: verify this JWT: ${req.params.token}`)
})

app.get('/auth/settoken', oidc.ensureAuthenticated(), (req, res) => {
    if (req.userinfo) { // or req.isAuthenticated()
        res.send(`Hi ${req.userinfo.name}! you are logged in`);
    } else {
        const jwt = require('njwt');
        const userContext = req.userContext;
        const claims = { iss: 'exp', sub: userContext.userinfo.name }
        const token = jwt.create(claims, process.env.SECRET_KEY)
        token.setExpiration(new Date().getTime() + 60 * 1000)

        res.cookie('jwt', token.compact(), { maxAge: 900000, httpOnly: true })

        console.log('cookie have created successfully');
        res.redirect(req.query.uri);
    }
})

app.get('/auth/welcome', oidc.ensureAuthenticated(), (req, res) => {
    if (req.isAuthenticated()) {
        const userContext = req.userContext;
        res.cookie('tokentest', userContext, { maxAge: 900000, httpOnly: true })
        res.send(`Hi ${userContext.userinfo.name}! you are logged in`);
    } else {
        res.send(`Please enter correct credentials`);
    }
})

oidc.on('ready', () => {
    app.listen(port, () => console.log('Node-Okta authentication app started'));
});
