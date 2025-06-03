const nodemailer = require("nodemailer");

exports.sendEmail = async (req) => {
   
    const transporter = nodemailer.createTransport({
        service: process.env.SMPT_SERVICE,
        auth: {
            user:process.env.SMPT_MAIL,
            pass:process.env.SMPT_PASSWORD,
        },    
    });
    console.log(req.message)
    const mailOptions = {
        from:process.env.SMPT_MAIL,
        to: req.email,
        subject: req.subject,
        text: req.message,
    };

    await transporter.sendMail(mailOptions);
        }