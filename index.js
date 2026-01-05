const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory throttling
const throttleMap = new Map(); // key = IP, value = [timestamps]

const isValidSAphone = (phone) => {
    const cleaned = phone.replace(/\s+/g, "");
    return /^(?:[6-8][0-9]{8}|0[6-8][0-9]{8}|\+27[6-8][0-9]{8})$/.test(cleaned);
};

const isValidEmail = (email) => /(?:@gmail\.com|@icloud\.com)$/i.test(email);

const hasTwoWords = (name) => name.trim().split(" ").length >= 2;

// Configure SMTP transport
const transporter = nodemailer.createTransport({
    host: "mail.linetechsoftwares.co.za",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

app.post("/send", async (req, res) => {
    const { from_name, from_email, phone, message } = req.body;
    const clientIP = req.ip;

    // Throttle check
    const now = Date.now();
    const timestamps = throttleMap.get(clientIP) || [];
    const recent = timestamps.filter(ts => now - ts < 30000); // last 30s
    if (recent.length >= 2) {
        return res.status(429).json({ success: false, error: "You can only send 2 messages every 30 seconds." });
    }
    recent.push(now);
    throttleMap.set(clientIP, recent);

    // Validation
    if (!from_name || !from_email || !phone) {
        return res.status(400).json({ success: false, error: "Missing required fields." });
    }
    if (!hasTwoWords(from_name)) {
        return res.status(400).json({ success: false, error: "Please provide your full name (at least 2 words)." });
    }
    if (!isValidSAphone(phone)) {
        return res.status(400).json({ success: false, error: "Please enter a valid South African phone number." });
    }
    if (!isValidEmail(from_email)) {
        return res.status(400).json({ success: false, error: "Please use a Gmail or iCloud email only." });
    }

    try {
        // Email to Line Tech
        await transporter.sendMail({
            from: `"Line Tech Softwares" <info@linetechsoftwares.co.za>`,
            to: "info@linetechsoftwares.co.za",
            subject: "New Website Enquiry",
            text: `New website enquiry received:\n
Name: ${from_name}
Email: ${from_email}
Phone: ${phone}
Message:
${message}`,
        });

        // Confirmation email to user
        await transporter.sendMail({
            from: `"Line Tech Softwares" <info@linetechsoftwares.co.za>`,
            to: from_email,
            subject: "We received your message",
            text: `Hello ${from_name},

Thank you for contacting Line Tech Softwares. We have received your message and will contact you shortly.

Here is a copy of your submission:

Name: ${from_name}
Email: ${from_email}
Phone: ${phone}
Message:
${message}

Best regards,
Line Tech Softwares Team`,
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error. Please try again later." });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mailer running on port ${PORT}`));
