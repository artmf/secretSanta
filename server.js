const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const data = require("./modules/data-service.js");
const exphbs = require("express-handlebars");
const clientSessions = require("client-sessions")

var alreadyDraw;

app.engine(".hbs", exphbs({ extname: ".hbs"}));
app.set("view engine", ".hbs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(clientSessions({
    cookieName: "session", // this is the object name that will be added to 'req'
    secret: process.env.SESSION, // long un-guessable string.
    duration: 15 * 60 * 1000, // duration of the session in milliseconds (4 hours)
    activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
  }));
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});

const user = {
    username: process.env.SITEUSER,
    password: process.env.SITEPASSWORD
};

function ensureLogin(req, res, next) {

    if(!req.session.user) {

        res.redirect("/login");
    }
    else {

        next();
    }
}

const HTTP_PORT = process.env.PORT || 8080;

function onHttpStart() {
    console.log("Server listening on: " + HTTP_PORT);
}
app.get("/", (req, res) => {

    res.redirect("/login");
});

app.get("/login", (req, res) => {

    res.render("login");
});

app.post("/login", (req, res) => {
    const username = req.body.userName;
    const password = req.body.password;

    if (username === "" || password === "") {

        res.render("login", { errorMsg: "Missing credentials!"});
    }

    if(username === process.env.SITEUSER && password === process.env.SITEPASSWORD) {

        req.session.user = {
            username: user.username
        };

        res.redirect("/participants");
    }
    else {

        res.render("login", { errorMsg: "Invalid username or password!"});
    }
});

app.get("/logout", function(req, res) {
    req.session.reset();
    res.redirect("/login");
  });

app.get("/participants", ensureLogin, (req, res) => {

    data.getAllParticipants().then( (data) => {

        if (data.length == 1) {
            
            res.render("participants", {participants: data});
        }
        else if (data.length > 0) {

            if(data[0].secretName != "") {

                res.render("participants", {participants: data, draw: "Activate", emailBtn: "Activate", drawAlreadyDone: "Activate"});
            }
            else {

                res.render("participants", {participants: data, draw: "Activate"});
            }
        }
        else {

            res.render("participants", { message: "no results" });
        }
    }).catch( (err) => {

        res.render("participants", {error: err});
    });
});

app.get("/addParticipant", ensureLogin, (req, res) => {

    res.render("addParticipant");
});

app.post("/addParticipant", ensureLogin, (req, res) => {

    data.addParticipant(req.body).then( () => {

        res.render("addParticipant", {message: "Participant added!"});
    }).catch( (err) => {

        res.render("addParticipant", { error: "Participant not added. Name must be unique!"});
    });
});

app.get("/participants/delete/:participantNum", ensureLogin, (req, res) => {

    data.deleteParticipant(req.params.participantNum).then( () => {

        res.redirect("/participants");
    }).catch( (err) => {

        res.send(err);  
    });
});

app.get("/draw", ensureLogin, (req, res) => {

    data.generateSecret().then( () => {

        res.render("participants", {message: "Draw completed!", back: "Activate"});
    }).catch( (err) => {

        res.render("participants", {error: "Error: " + err});
    })
});

app.get("/sendEmail/:participantNum", ensureLogin, (req,res) => {

    data.sendEmail(req.params.participantNum).then( (name) => {

        data.getAllParticipants().then( (data) => {
            
            res.render("participants", {participants: data, emailMessage: "Email sent to " + name, emailBtn: "Activate", draw: "Activate", drawAlreadyDone: "Activate"});
        }).catch( (err) => {

            res.render("participants", {error: err});
        });
    }).catch( (err) => {

        res.render("participants", {emailMessage: "Email not sent: " + err});
    })
});

app.get("/sendEmailAll", ensureLogin, (req, res) => {

    data.sendEmailAll().then( () => {

        data.getAllParticipants().then( (data) => {
            
            res.render("participants", {participants: data, emailSentAll: "Email sent to everybody", emailBtn: "Activate", draw: "Activate", drawAlreadyDone: "Activate"});
        }).catch( (err) => {

            res.render("participants", {error: err});
        });
    }).catch( (name) => {

        res.render("participants", {emailMessage: "Email not sent to " + name + ". For everyone before him the e-mail was sent!"});
    });
});

data.initialize().then(() => {

    app.listen(HTTP_PORT, onHttpStart);
}).catch((error) => {

    console.log("Unable to start server: " + error);
});