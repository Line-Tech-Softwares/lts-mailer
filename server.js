const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure SMTP transport
const transporter = nodemailer.createTransport({
    host: "mail.linetechsoftwares.co.za",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Endpoint to handle contact form submission
app.post("/send", async (req, res) => {
    const { from_name, from_email, phone, message } = req.body;

    try {
        // 1) Email to Line Tech (you)
        await transporter.sendMail({
            from: `"Line Tech Softwares" <info@linetechsoftwares.co.za>`,
            to: "info@linetechsoftwares.co.za",
            subject: "New Website Enquiry",
            text:
`New website enquiry received:

Name: ${from_name}
Email: ${from_email}
Phone: ${phone}

Message:
${message}`
        });

        // 2) Confirmation email to user
        await transporter.sendMail({
            from: `"Line Tech Softwares" <info@linetechsoftwares.co.za>`,
            to: from_email,
            subject: "We received your message",
            text:
`Hello ${from_name},

Thank you for contacting Line Tech Softwares. We have received your message and will contact you shortly.

Here is a copy of your submission:

Name: ${from_name}
Email: ${from_email}
Phone: ${phone}

Message:
${message}

Best regards,
Line Tech Softwares Team`
        });

        res.send("success");
    } catch (error) {
        console.error(error);
        res.status(500).send("error");
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Mailer running on port ${PORT}`);
});
