require("dotenv").config();

const Sequelize = require('sequelize');
const nodemailer = require("nodemailer");

//objPart = [];

var sequelize = new Sequelize('d7ik0md699s5oi', process.env.SEQUSER, process.env.SEQPASSWORD, {
    host: 'ec2-174-129-253-162.compute-1.amazonaws.com',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: true
    }
});

var Participants = sequelize.define("Participants", {

    participantNum: {
        
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {

        type: Sequelize.STRING,
        unique: true
    },
    email: Sequelize.STRING,
    secretName: Sequelize.STRING
});

module.exports.initialize = () => new Promise((resolve, reject) => {

    sequelize.sync().then( () => {

        resolve();
    }).catch( () => {

        reject("Unable to sync the database");
    });
});

module.exports.getAllParticipants = () => new Promise( (resolve, reject) => {
    
    Participants.findAll().then( (data) => {
        
        resolve(data);
    }).catch( () => {

        reject("No result for participants returned!");
    });
});

module.exports.addParticipant = (body) => new Promise( (resolve, reject) => {

    for (element in body) { //body is an object

        if (element == "") {

            element = null;
        }
    };

    Participants.create({

        participantNum: body.participantNum,
        name: body.name,
        email: body.email,
        secretName: ""
    }).then( () => {

        Participants.update(

            {secretName: ""},
            {where: {}}
        ).then( () => {

            resolve();
        }).catch( (err) => {

            reject("Unable to set all participants Secret Name to null after deletion");
        });
    }).catch( () => {

        reject("Unable to create participant!");
    });
});

module.exports.deleteParticipant = (partNum) => new Promise( (resolve, reject) => {

    Participants.destroy({
        where: {participantNum: partNum}
    }).then( () => {
        
        Participants.update(

            {secretName: ""},
            {where: {}}
        ).then( () => {

            resolve();
        }).catch( (err) => {

            reject("Unable to set all participants Secret Name to null after deletion");
        });
    }).catch( (err) => {

        reject("Unable to delete participant. Error: " + err);
    });
});

module.exports.generateSecret = () => new Promise( (resolve, reject) => {

    
    Participants.findAll().then( (data) => {

        var i = 0;
        var randomNum;
        let numParti = data.length;
        let flipNum = data.length;
        let flip = true;
        let tempArray = [];
        let tempArray2 = [];
        let test = [];

        for(i = 0; i < data.length; i++) {

            tempArray.push(i);
            test.push({

                participantNum: data[i].participantNum,
                name: data[i].name,
                email: data[i].email,
                secretName: data[i].secretName
            });
        }
    
        for (i = 0; i < (numParti * 50); i++) {
    
            if (i == flipNum) {
                
                flip = !flip;
                flipNum += numParti;
            }
            
            if (flip) {
                randomNum = Math.floor(Math.random() * tempArray.length);
                
                tempArray2.push(tempArray[randomNum]);
                tempArray.splice(randomNum, 1);
            }
            else {
                randomNum = Math.floor(Math.random() * tempArray2.length);
    
                tempArray.push(tempArray2[randomNum]);
                tempArray2.splice(randomNum, 1);
            }
        }
            
        for(i = 0; i < test.length; i++) {
    
            if (test.length == 2) {
    
                test[tempArray[i]].secretName = test[tempArray[i + 1]].name;
                test[tempArray[i + 1]].secretName = test[tempArray[0]].name;
                i = test.length;
            }
            else if (i < test.length - 1) {
                
                test[tempArray[i]].secretName = test[tempArray[i + 1]].name
            }
            else {
    
                test[tempArray[i]].secretName = test[tempArray[0]].name;
            }
        }

        async function forLoop() {

            for(const element of test) {

                await updateParticipant(element);
            }
        }

        function updateParticipant(participant) {

            return new Promise( (resolve, reject) => {

                Participants.update({
    
                    secretName: participant.secretName
                }, {
        
                    where: { participantNum: participant.participantNum }
                }).then( () => {
        
                    resolve();
                }).catch( (err) => {
        
                    reject(err);
                });
            });
        }

        forLoop().then( () => {

            resolve();
        }).catch( (err) => {
    
            reject(err);
        });
    });
});

module.exports.sendEmail = (partNum) => new Promise( (resolve, reject) => {

    let transporter = nodemailer.createTransport({

        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions;
    let name;
    
    Participants.findAll().then( (data) => {

        data.forEach( (element) => {

            if (element.participantNum == partNum) {
                name = element.name;
                mailOptions = {
    
                    from: process.env.EMAIL,
                    to: element.email,
                    subject: "Amigo Oculto da familia Montesano",
                    text: "Olá " + name + ",\n\n" + "Seu amigo oculto é: " + element.secretName + "\n" + "Valor do presente: R$50,00" + "\n\n" + "Ho Ho Ho!!!\nFeliz Natal Familia!!!" + "\n\n" + "Ass. Artur"
                };
            }
        });

        transporter.sendMail(mailOptions, function (err, data) {

            if (err) {
    
                reject(name);
            }
            else {
    
                resolve(name);
            }
        });    
    });
});

module.exports.sendEmailAll = () => new Promise( (resolve, reject) => {

    let transporter = nodemailer.createTransport({

        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions;
    let name;

    Participants.findAll().then( (data) => {

        async function forLoop() {

            for(const element of data) {
    
                await send(element);
            }
        }
        
        function send(element) {
    
            return new Promise( (resolve, reject) => {
                    
                name = element.name;
                mailOptions = {
    
                    from: process.env.EMAIL,
                    to: element.email,
                    subject: "Amigo Oculto da familia Montesano",
                    text: "Olá " + name + ",\n\n" + "Seu amigo oculto é: " + element.secretName + "\n" + "Valor do presente: R$50,00" + "\n\n" + "Ho Ho Ho!!!\nFeliz Natala Familia!!!" + "\n\n" + "Ass. Artur Felix"
                };

                transporter.sendMail(mailOptions, function (err, data) {

                    if (err) {
                
                        reject(name);
                    }
                    else {
                
                        resolve(name);
                    }
                });
            });
        }
    
        forLoop().then( () => {
    
            resolve();
        }).catch( (name) => {
        
            reject(name);
        });
    });
});