const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const pdf = require('html-pdf'); // You'll need to install this package
const SerialNumber = require('./models/Serial');
const Driver = require('./models/Driver');
const Warranty = require('./models/Warranty');
const SystemInfo = require('./models/SystemInfo'); 
const Certificate = require('./models/Certificate'); 
const Reseller = require('./models/Reseller'); 
const WarrantyClaim = require('./models/WarrantyClaim');
const os = require('os');
const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'views', 'admin')));

// Serve static files from the 'uploads' and 'scripts' directory
app.use('/uploads', express.static('uploads'));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/statics', express.static(path.join(__dirname, 'statics')));

// Use sessions
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true in production with HTTPS
}));


//Mail Sending Credentials
const transporter = nodemailer.createTransport({
    host: "radiant.icewarpcloud.in",
    port: 465,
    secure: true, // Use true for port 465, false for all other ports
    auth: {
      user: "alerts@bitboxpc.com",
      pass: "Hello@123",
    },
});

//DatabaseURL
const dbURI = 'mongodb+srv://Bitbox-admin:Bitbox-admin@cluster0.gpzogeq.mongodb.net/Bitbox-admin?retryWrites=true&w=majority&appName=Cluster0';
//const dbURI = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.10';

//MongoDB Connecction with URL
mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });


app.set('view engine', 'ejs');

// Home Route
app.get('/', (req, res) => {
    res.render('admin/serial-warrenty');
});

const getClientIpAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
    
    return ipAddress;
};

//Get Local IP Address
app.get('/get_local_ip', async (req, res) => {
    try {
        const ipAddress = getClientIpAddress(req);
        

        // Sending the IP address in the response
        res.json({ ip: ipAddress });
    } catch (error) {
        console.error('Error getting IP address:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/claim-warranty', async (req, res) => {
    try {
      res.render('claim-warranty');
       
    } catch (error) {
        console.error('Error getting IP address:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/claim-warranty', async (req, res) => {
    try {
        const { certificateId, phoneNumber, emailId, serialNumber,query } = req.body;
        const warrantyClaim = new WarrantyClaim({
            certificateId,
            phoneNumber,
            emailId,
            serialNumber,
            message:query,
            status: 'submitted'
        });

        const exists = await Certificate.exists(serialNumber);

        if(!exists)
        {
            res.status(500).send({ message: 'Serail Number not exist', error });
        }



        await warrantyClaim.save();

        async function sendMail() {
            const info = await transporter.sendMail({
                from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                to: `"Recipient" <${emailId}>`,
                subject: "Warranty Claim Submitted",
                text: `Dear Bitbox PC User,
                `,
                html: `<b>Dear Bitbox PC User, <br>Your Warranty Claim for Serail Number ${serialNumber} With Refrence To Certificate ID ${certificateId} <br> Submitted Sucessfully, We'll Convey You Further Updates on Your Mail</b></br>

                <br><br>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com<br><br>
                Regards,<br>
                Team Bitbox
                <br><br>
                Toll Free: 1800309PATA <br>
                eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a> <br>
                web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a> <br><br>
                <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140">`,
                
            });


        }
        await sendMail();


        res.status(201).send({ message: 'Warranty claim submitted successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Error submitting warranty claim', error });
    }
});

app.get('/warrantyClaim/status/:certificateId', async (req, res) => {
    try {
        const { certificateId } = req.params;
        const warrantyClaim = await WarrantyClaim.findOne({ certificateId });

        if (warrantyClaim) {
            res.status(200).send({ status: warrantyClaim.status });
        } else {
            res.status(404).send({ message: 'Certificate ID not found' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Error checking status', error });
    }
});


// Device Check Route
app.get('/check-device', async (req, res) => {
    res.render('check-device', { systemInfo: req.session.systemInfo });
});

// Endpoint to receive and save system information
app.post('/system-info', async (req, res) => {
    try {
        const { manufacturer, Model, Serial_Number, ipAdd } = req.body;
        console.log("Inside");
        console.log(ipAdd);

        if (!manufacturer || !Model || !Serial_Number || !ipAdd) {
            return res.status(400).send('All fields are required');
        }

        // Check if the ipAdd exists in the database
        const existingSystemInfo = await SystemInfo.findOne({ ipAdd });

        if (existingSystemInfo) {
            // If it exists, directly render the temp view
            return res.render('temp');
        } else {
            // If it doesn't exist, create a new entry or update the existing one
            const systemInfo = {
                manufacturer: manufacturer || "N/A",
                Model: Model,
                Serial_Number: Serial_Number || "N/A",
                ipAdd: ipAdd
            };

            // Find an existing entry with the same ipAdd and update it, or create a new entry if it doesn't exist
            await SystemInfo.findOneAndUpdate(
                { ipAdd },
                { manufacturer, Model, Serial_Number, ipAdd },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            res.render('temp');
        }
    } catch (error) {
        console.error('Error saving system information:', error);
        res.status(500).send('Error saving system information');
    }
});


// Endpoint to fetch the latest system information
app.get('/fetch-system-info', async (req, res) => {
    const ip = req.query.ip;
    try {
        const systemInfo = await SystemInfo.findOne({ ipAdd: ip }).exec();
        
        if (systemInfo) {
            res.json(systemInfo);
        } else {
            res.status(404).json({ error: 'System info not found for this IP address' });
        }
    } catch (error) {
        console.error('Error fetching system information:', error);
        res.status(500).send('Error fetching system information');
    }
});

// Fetch Latest driver
app.get('/latest-driver', async (req, res) => {
    const model = req.query.serial.toUpperCase();
    try {
        const latestDriver = await Driver.findOne({ model: model }).sort({ date: -1 });
        console.log(latestDriver);
        if (latestDriver) {
            res.render('latest-driver', { driver: latestDriver });
        } else {
            res.status(404).send('No drivers found for the specified model');
        }
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).send('Error fetching drivers');
    }
});


//Get the designated entru from randome number fetch randome number from user session try to find out inse DB
app.get('/deleteran', async (req, res) => {
    const randomNumber = req.query.randomNumber;

    if (!randomNumber) {
        return res.status(400).send('Random number is required');
    }

    try {
        const result = await SystemInfo.findOneAndDelete({ ipAdd: randomNumber });

        if (result) {
            res.status(200).send(`Entry with random number ${randomNumber} deleted`);
        } else {
            res.status(404).send('Entry not found');
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        res.status(500).send('Internal server error');
    }
});


// Warranty Check Route
app.get('/check-warranty', async (req, res) => {
    const serialNumber = req.query.serial;
    try {
        const warranty = await Warranty.findOne({ serialNumber: serialNumber, verify: true });
        if (warranty) {
            res.json({ status: 'registered', expiryDate: warranty.expiryDate });
        } else {
            res.json({ status: 'not_registered' });
        }
    } catch (error) {
        console.error('Error checking warranty:', error);
        res.status(500).send('Error checking warranty');
    }
});

// Warranty Check Route
app.get('/check-warranty2', async (req, res) => {
    const serialNumber = req.query.serial;
    try {
        const warranty = await Warranty.findOne({ serialNumber: serialNumber, verify: true });
        if (warranty) {
            res.render('admin/serial-warrenty', { status: 'registered', expiryDate: warranty.expiryDate, serialNumber });
        } else {
            res.render('admin/serial-warrenty', { status: 'not_registered', expiryDate: "not_registered" });
        }
    } catch (error) {
        console.error('Error checking warranty:', error);
        res.status(500).send('Error checking warranty');
    }
});



// Render Warranty Registration Route
app.get('/register-warranty', (req, res) => {
    res.render('register-warranty');
});
//Render Warranty Registration Route
app.get('/serial-warrenty', (req, res) => {
    res.render('admin/serial-warrenty');
});


//Render Temp Route
app.get('/temp', (req, res) => {
    res.render('temp');
});
//Render Single Warrenty
app.get('/single_warrenty_verify', async (req, res) => {
    try {
        const warranties = await Warranty.find({ batch: null });
        res.render('admin/single_warrenty_verify', { warranties });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//Render Bulk Warrenty Page
app.get('/bulk_warrenty_verify', async (req, res) => {
    try {
        const groupedWarranties = await Warranty.aggregate([
            {
                $match: {
                    batch: { $ne: null }
                }
            },
            {
                $group: {
                    _id: "$batch",
                    commonFields: { $first: "$$ROOT" },
                    serialAndModel: {
                        $push: {
                            serialNumber: "$serialNumber",
                            model: "$model"
                        }
                    }
                }
            }
        ]);

        res.render('admin/bulk_warrenty_verify', { groupedWarranties });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
// Multer file filter to accept only PDFs and EXEs
const fileFilter = (req, file, cb) => {
    // Regular expression to test file extensions
    const allowedTypes = /pdf|exe/;
    // Check MIME type
    const mimetype = allowedTypes.test(file.mimetype);
    // Check file extension
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: File upload only supports PDF and EXE files!'), false);
    }
};
// Initialize multer with storage and file filter
const upload = multer({
    storage: storage
});




//Serail MOdel Update 
app.post('/update-serial', async (req, res) => {
    const { serialNumber, modelNumber, newserialNumber, newmodelNumber } = req.body;
    try {
        const updatedSerial = await SerialNumber.findOneAndUpdate(
            { serialNumber: serialNumber, modelNumber: modelNumber }, // Find the serial number to update
            { serialNumber: newserialNumber, modelNumber: newmodelNumber }, // Set the new serial number and model number
            { new: true } // Return the updated document
        );
        console.log(updatedSerial);
        res.redirect(req.get('referer')); // Redirect to admin page after updating
    } catch (error) {
        console.error('Error updating serial number:', error);
        res.status(500).send('Error updating serial number');
    }
});

app.post('/add-serial', upload.single('file'), async (req, res) => {
    const { serialNumber, modelNumber, testedBy, processor, motherboard, ram, ssd, hdd, monitorSize } = req.body;
    const file = req.file.filename;

    try {
        // Check if the serial number already exists
        const existingSerial = await SerialNumber.findOne({ serialNumber });

        if (existingSerial) {
            // If serial number exists, return an error message or redirect with a message
            return res.status(400).send('Serial number already exists');
        }

        // If serial number does not exist, proceed to add the new serial
        const newSerial = new SerialNumber({
            serialNumber,
            modelNumber,
            testedBy,
            uploadedFile: file,
            processor,
            motherboard,
            ram,
            ssd,
            hdd,
            monitorSize
        });

        await newSerial.save();
        res.redirect(req.get('referer')); // Redirect to admin page after adding
    } catch (error) {
        console.error('Error adding serial number:', error);
        res.status(500).send('Error adding serial number');
    }
});




//Resgiter for Warrenty
app.post('/register-warranty', upload.single('billPdf'), async (req, res) => {
    const { name, email, serialNumber, purchaseDate, expiryDate, address, city, pincode, state, phoneNumber, model } = req.body;
    const billPdfPath = req.file.path;

    try {
        const serialNumbers = Array.isArray(serialNumber) ? serialNumber : [serialNumber];

        for (const sn of serialNumbers) {
            const existingWarranty = await Warranty.findOne({ serialNumber: sn });
            if (existingWarranty) {
                return res.status(400).send(`Device with serial number ${sn} is already registered, please connect with our customer care at support@bitboxpc.com`);
            } else {
                const newWarranty = new Warranty({
                    name,
                    email,
                    serialNumber: sn,
                    purchaseDate,
                    expiryDate,
                    address,
                    city,
                    pincode,
                    state,
                    phoneNumber,
                    model,
                    billPdf: billPdfPath,
                });
                await newWarranty.save();
            }
        }
        res.send('<script>alert("Warranty Registration Successful."); window.history.back();</script>');
    } catch (error) {
        console.error('Error registering warranty:', error);
        res.status(500).send('Error registering warranty');
    }
});

//Check for the serail number exist
app.get('/serial-numbers/:serial', async (req, res) => {
    try {
        const serial = req.params.serial;
       
        const serialNumber = await SerialNumber.findOne({ serialNumber: serial });
        if (serialNumber) {
            res.json({ valid: true, model: serialNumber.modelNumber });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error checking serial number:', error);
        res.status(500).send('Error checking serial number');
    }
});



// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    } else {
        res.redirect('/admin');
    }
}


// Admin Routes
// app.get('/admin', (req, res) => {
//     res.render('admin/login');
// });



//Register Bulk  Warrenty
app.post('/bulk-verify-warranty', upload.single('billPdf'), async (req, res) => {
    const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber, purchaseMedium, company, reseller, warrantyType,selectedWarrantyOption } = req.body;
    const warranties = [];
    const expiryDate = expiryyear;
    const billPdfPath = req.file.path;
    console.log(selectedWarrantyOption);

    if (numComputers == 1) {
        var constant = null;
    } else {
        var constant = Math.floor(10000000 + Math.random() * 90000000);
    }

    const purchaseDetails = purchaseMedium === 'direct' ? company : reseller;

    for (let i = 1; i <= numComputers; i++) {
        const serialNumber = req.body[`serialNumber${i}`];
        const model = req.body[`model${i}`];

        warranties.push({
            expiryDate,
            name,
            email,
            purchaseDate,
            address,
            city,
            pincode,
            state,
            phoneNumber,
            serialNumber,
            model,
            billPdf: billPdfPath,
            batch: constant,
            purchaseDetails,
            warrantyType:selectedWarrantyOption // Adding the new field to the warranty object
        });
    }

    try {
        const existingWarranties = await Warranty.find({
            serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
        });

        const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);
        const newWarranties = warranties.filter(warranty => !existingSerialNumbers.includes(warranty.serialNumber));
        const duplicateWarranties = warranties.filter(warranty => existingSerialNumbers.includes(warranty.serialNumber));

        const response = {
            success: newWarranties.map(warranty => warranty.serialNumber),
            duplicate: duplicateWarranties.map(warranty => warranty.serialNumber)
        };

        if (duplicateWarranties.length > 0) {
            res.status(201).send(`This Device ${response.duplicate.join(', ')} is already registered, please connect with our customer care at support@yourdomain.com`);
        }

        await Warranty.insertMany(newWarranties);
        
        // Send email with PDF attachment
        async function sendMail() {
            const info = await transporter.sendMail({
                from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                to: `"Recipient" <${email}>`,
                subject: "Warranty Registration Submitted and Pending for Verification ",
                text: `Dear Bitbox PC User,
                Your warranty registration has been successfully completed. We will verify the details and notify you as soon as possible.
                
                Regards,
                Team Support
                BitBox`,
                html: `Dear Customer, <br>
                <b>Thank you for submitting your warranty registration form. We have successfully received your details and will now proceed with verification. Rest assured, our team will carefully review your submission. <br>
                We appreciate your patience during this process. You will receive an update from us shortly regarding the status of your warranty registration. <br>
                If you have any urgent inquiries or require further assistance, please feel free to reach out to our customer support team at support@bitboxpc.com  </b>
                <br><br>
                Best Regards,<br>
                Team Bitbox
                <br><br>
                Toll Free: 1800309PATA <br>
                eMail: <a href="">support@bitboxpc.com </a> <br>
                web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`,
                
            });

            console.log('Message sent: %s', info.messageId);
        }
        await sendMail();


        res.status(201).send('Warranty Request Submitted Sucessfully');
    } catch (error) {
        console.error('Error SUBMITTING warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});

//Verify Warrenty
app.post('/verify-warranty', async (req, res) => {
    const { serialNumber, purchaseDate, email, duration, name, address, city, phoneNumber, model, billPdf,warrantyType } = req.body;
  
    try {
        const purchaseDateObj = new Date(purchaseDate);
        const expiryDateObj = new Date(purchaseDateObj);
        expiryDateObj.setDate(expiryDateObj.getDate() + (365 * parseInt(duration)) - 1);
        

        // Ensure the expiry date has the correct format and zero time
        expiryDateObj.setHours(0, 0, 0, 0);

        const expiryDate = new Date(expiryDateObj).toDateString();
        const purchase_date = new Date(purchaseDate).toDateString();
        let certificateID = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // Find and update the warranty information
        const warranty = await Warranty.findOneAndUpdate(
            { serialNumber: serialNumber },
            {
                verify: true,
                purchaseDate: new Date(purchaseDate),
                expiryDate: expiryDateObj,
                certificateID: certificateID // Add the certificate ID here
            },
            { new: true }
        );



        const getWarrantyImage = (duration) => {
            if (duration == 1) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/1_year_warranty.jpg";
            } else if (duration == 2) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/Warrant_2.png"; // Replace with actual URL
            } else if (duration == 3) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/Warrant_3.png"; // Replace with actual URL
            } else {
                return ""; // Default to an empty string if no valid duration is provided
            }
        };
        
        const warrantyImageSrc = getWarrantyImage(duration);
        


        const pdfContent = `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warranty Certificate</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .certificate {
            border: 5px solid #C7A94F;
            padding: 10px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            position: relative;
        }

        .certificate:before {
            content: "";
            position: absolute;
            top: 5px;
            left: 5px;
            right: 5px;
            bottom: 5px;
            border: 2px dotted #C7A94F;
            pointer-events: none;
        }

        .certificate-header {
            display: grid;
            grid-template-columns: 1fr;
            align-items: center;
            margin-bottom: 20px;
            text-align: center;
        }

        .certificate-header img {
            width: 100%;
            height: auto;
        }

        .certificate-content {
            margin-top: 20px;
        }

        .certificate-content p {
            font-size: 24px;
            font-weight: 500;
        }

        .details {
            display: grid;
            grid-template-columns: auto auto;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
            text-align: center;
        }

        .details div {
            margin-bottom: 10px;
        }

        .details div span {
            display: inline-block;
            width: 250px;
            font-size: 20px;
        }

        .certificate-footer {
            margin-top: 20px;
            font-size: 24px;
            width: 100%;
        }

        .terms-conditions {
            margin-top: 20px;
            font-size: 18px;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-header">
            <img src="${warrantyImageSrc}" alt="${duration} Year Warranty">
        </div>

        <div class="certificate-content">
            <p>This document certifies the warranty coverage for the product purchased from PATA Electric Company and serves as proof of your entitlement to warranty services. Please read this certificate carefully for important terms and conditions.</p>
            <div class="details">
               <div>
                    <span>■ Product Model Number:</span> ${model}
                </div>
                <div>
                    <span>■ Product Serial Number:</span> ${serialNumber}
                </div>
                <div>
                    <span>■ Date of Purchase:</span> ${purchase_date}
                </div>
                <div>
                    <span>■ Purchaser's Name:</span> ${name}
                </div>
                <div>
                    <span>■ Seller's Name:</span> ${warranty.purchaseDetails}
                </div>
                <div>
                    <span>■ Warranty Period:</span> ${duration} Years
                </div>
                <div>
                    <span>■ Warranty Expiry:</span> ${expiryDate}
                </div>
                <div>
                    <span>■ Certificate ID:</span> ${certificateID}
                </div>
            </div>
        </div>

        <div class="certificate-footer">
            <p>PATA Electric Company warrants that the product mentioned above is free from defects in material and workmanship under normal use during the warranty period. The warranty covers repairs or replacement of the product components, subject to the terms and conditions specified herein.</p>
        </div>

        <div class="terms-conditions">
            <h3>Terms and Conditions:</h3>
            <p>■ Warranty Period: The warranty period commences on the date of purchase and lasts for the duration specified on this certificate.</p>
            <p>■ Proof of Purchase: This certificate, along with the original purchase receipt, serves as proof of purchase and is required for warranty claims.</p>
            <p>■ Scope of Warranty: The warranty covers defects in material and workmanship. It does not cover damages resulting from accidents, misuse, alterations, or unauthorized repairs.</p>
            <p>■ Warranty Service: In the event of a covered defect, please contact our customer support at Toll-Free: 18003009PATA | support@bitboxpc.com to initiate a warranty claim.</p>
        </div>
    </div>
</body>
</html>
        `;


        const pdfOptions = {
            format: 'A2',
            childProcessOptions: {
                env: {
                    OPENSSL_CONF: '/dev/null'
                }
            }
        };

        // Save PDF
        const pdfPath = `uploads/warranty-${serialNumber}.pdf`;
        pdf.create(pdfContent,pdfOptions).toFile(pdfPath, async (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                return res.status(500).send('Error creating PDF');
            }

            // Format expiry date
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            const formattedDate2 = expiryDateObj.toLocaleDateString(undefined, options);

            // Send email with attachment
            async function sendMail() {
                const info = await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${email}>`,
                    subject: "Warranty Verification Completed: Your Warranty is Attached",
                    text: `Dear Bitbox PC User,
                    Your warranty for serial number ${serialNumber} has been verified.
                    System Purchase Date: ${purchaseDate}
                    Warranty End date: ${expiryDateObj.toDateString()}
                    Regards,
                    Team Support
                    BitBox`,
                    html: `<b>We are pleased to inform you that the bulk warranty verification process has been successfully completed. Your warranty certificate is  attached here.</b>
                    <br><br>

                    <b>Details: <br>
                    Warranty Period: ${duration} Years <br>
                    Warranty Expiry: ${expiryDateObj.toDateString()} <br>
                    Certificate ID : ${certificateID} <br>
                    <h2>Coverage Details: ${warrantyType} </h2>
                    </br>

                    <br><br>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com<br><br>
                    Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a> <br>
                    web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140">`,
                    attachments: [
                        {
                            filename: `warranty-${serialNumber}.pdf`,
                            path: result.filename
                        }
                    ]
                });

                console.log('Message sent: %s', info.messageId);
            }
            await sendMail();

            await new Certificate({
                serialNumber: warranty.serialNumber,
                certificateLink: pdfPath
            }).save();

            res.send('<script>alert("Warranty Verified Successfully."); window.history.back();</script>');
        });
    } catch (error) {
        console.error('Error verifying warranty:', error);
        res.status(500).send('Error verifying warranty');
    }
});

//Verify Bulk Warrenty
app.post('/bulk-verify-warranty2', async (req, res) => {
    const { batch, purchaseDate, email, duration, name, address, city, phoneNumber, model, billPdf, warrantyType} = req.body;

    try {
        const purchaseDateObj = new Date(purchaseDate);
        const expiryDateObj = new Date(purchaseDateObj);
        expiryDateObj.setDate(expiryDateObj.getDate() + (365 * parseInt(duration)) - 1);
        let certificateID = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // Ensure the expiry date has the correct format and zero time
        expiryDateObj.setHours(0, 0, 0, 0);

        const expiryDate = new Date(expiryDateObj).toDateString();
        const purchase_date = new Date(purchaseDate).toDateString();

        // Find and update the warranty information
        const warranty = await Warranty.updateMany(
            { batch: batch },
            {
                verify: true,
                purchaseDate: new Date(purchaseDate),
                expiryDate: expiryDateObj,
                certificateID: certificateID // Add the certificate ID here
            },
            { new: true }
        );


        // Fetch all warranties associated with the batch after update
        const warranties = await Warranty.find({ batch: batch });

        const getWarrantyImage = (duration) => {
            if (duration == 1) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/1_year_warranty.jpg";
            } else if (duration == 2) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/Warrant_2.png"; // Replace with actual URL
            } else if (duration == 3) {
                return "https://raw.githubusercontent.com/vishalp743/bitbox_vpp_devloper/master_2/logo/Warrant_3.png"; // Replace with actual URL
            } else {
                return ""; // Default to an empty string if no valid duration is provided
            }
        };
        
        const warrantyImageSrc = getWarrantyImage(duration);

        let pdfContent = `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warranty Certificate</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .certificate {
            border: 5px solid #C7A94F;
            padding: 10px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            position: relative;
        }

        .certificate:before {
            content: "";
            position: absolute;
            top: 5px;
            left: 5px;
            right: 5px;
            bottom: 5px;
            border: 2px dotted #C7A94F;
            pointer-events: none;
        }

        .certificate-header {
            display: grid;
            grid-template-columns: 1fr;
            align-items: center;
            margin-bottom: 20px;
            text-align: center;
        }

        .certificate-header img {
            width: 100%;
            height: auto;
        }

        .certificate-content {
            margin-top: 20px;
        }

        .certificate-content p {
            font-size: 24px;
            font-weight: 500;
        }

        .details {
            display: grid;
            grid-template-columns: auto auto;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
            text-align: center;
        }

        .details div {
            margin-bottom: 10px;
        }

        .details div span {
            display: inline-block;
            width: 250px;
            font-size: 20px;
        }

        .certificate-footer {
            margin-top: 20px;
            font-size: 24px;
            width: 100%;
        }

        .terms-conditions {
            margin-top: 20px;
            font-size: 18px;
            width: 100%;
        }
        .warranty-info {
    border-collapse: collapse;
    width: 100%;
}

.warranty-info th, .warranty-info td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

.warranty-info th {
    background-color: #f2f2f2;
}

.warranty-info tr:hover {
    background-color: #f2f2f2;
}
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-header">
            <img src="${warrantyImageSrc}" alt="${duration} Year Warranty">
        </div>

        <div class="certificate-content">
            <p>This document certifies the warranty coverage for the product purchased from PATA Electric Company and serves as proof of your entitlement to warranty services. Please read this certificate carefully for important terms and conditions.</p>
            <div class="details">
                    <table class="warranty-info">
                        <tr>
                            <th>Product Model Number</th>
                            <th>Product Serial Number</th>
                            <th>Date of Purchase</th>
                            <th>Purchaser's Name</th>
                            <th>Seller's Name</th>
                            <th>Warranty Period</th>
                            <th>Expiry Date</th>
                        </tr>
         `;
        warranties.forEach(entry => {
            pdfContent += `
                <tr>
                    <td>${entry.model}</td>
                    <td>${entry.serialNumber}</td>
                    <td>${purchase_date}</td>
                    <td>${entry.name}</td>
                    <td>${entry.purchaseDetails}</td>
                    <td>${duration} Years</td>
                    <td>${expiryDate}</td>
                </tr>`;
        });
        pdfContent += `
                    </table>
                </div>
            </div>

            <h1>Certificate ID : ${certificateID}</h1>
        
       
           


            <br> <br> <br> <br>
            <div class="certificate-footer">
                <p>PATA Electric Company warrants that the product mentioned above is free from defects in material and workmanship under normal use during the warranty period. The warranty covers repairs or replacement of the product components, subject to the terms and conditions specified herein.</p>
            </div>
            <div class="terms-conditions">
                <h3>Terms and Conditions:</h3>
                <p>■ Warranty Period: The warranty period commences on the date of purchase and lasts for the duration specified on this certificate.</p>
                <p>■ Proof of Purchase: This certificate, along with the original purchase receipt, serves as proof of purchase and is required for warranty claims.</p>
                <p>■ Scope of Warranty: The warranty covers defects in material and workmanship. It does not cover damages resulting from accidents, misuse, alterations, or unauthorized repairs.</p>
                <p>■ Warranty Service: In the event of a covered defect, please contact our customer support at Toll-Free: 18003009PATA | support@bitboxpc.com to initiate a warranty claim.</p>
            </div>
        </div>
    </div>
 </div>
</body>
</html>
        `;

// console.log(pdfContent); // Outputs the complete HTML content for the warranty certificates


        const pdfOptions = {
            format: 'A2',
            childProcessOptions: {
                env: {
                    OPENSSL_CONF: '/dev/null'
                }
            }
        };


        // Save PDF
        const pdfPath = `uploads/bulk-warranty-verification-${batch}.pdf`;
        pdf.create(pdfContent,pdfOptions).toFile(pdfPath, async (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                res.status(500).send('Error creating PDF');
                return;
            }

            // Save certificate information in the database
            const certificatePromises = warranties.map(warranty => {
                return new Certificate({
                    serialNumber: warranty.serialNumber,
                    certificateLink: pdfPath
                }).save();
            });
            await Promise.all(certificatePromises);

            // Send email with PDF attachment
            async function sendMail() {
                const info = await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${email}>`,
                    subject: "Warranty Verification Completed: Your Warranty is Attached",
                    text: `Dear Bitbox PC User,
                    Your bulk warranty verification details for batch number <b> ${batch} </b> have been processed successfully. Please find the details attached.
                    
                    Regards,
                    Team Support
                    BitBox`,
                    html: `<b>We are pleased to inform you that the bulk warranty verification process has been successfully completed. Your warranty certificate is  attached here.</b>
                    <br><br>

                    <b>Details: <br>
                    Warranty Period: ${duration} Years <br>
                    Warranty Expiry: ${expiryDateObj.toDateString()} <br>
                    Certificate ID: ${certificateID} <br>
                    <h2>Coverage Details: ${warrantyType} </h2>
                    </br>

                    <br><br>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com<br><br>
                    Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a> <br>
                    web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140">`,
                    attachments: [
                        {
                            filename: `bulk-warranty-verification-${batch}.pdf`,
                            path: result.filename,
                        },
                    ],
                });

                console.log('Message sent: %s', info.messageId);
            }
            await sendMail();

            res.send('<script>alert("Bulk Warranty Verification Successful. PDF sent to your email."); window.history.back();</script>');
        });

    } catch (error) {
        console.error('Error verifying warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});

//Warrenty expiring in recent
app.get('/expiring-warranties', async (req, res) => {
    try {
        const today = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(today.getDate() + 10);
        
        const warranties = await Warranty.find();
        
        
        const expiringWarranties = warranties.filter(warranty => {
            const expiryDate = new Date(warranty.expiryDate); // Convert string to Date object
            return expiryDate >= today && expiryDate < tenDaysFromNow;
        });


        res.json(expiringWarranties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Route to add a serial number
// app.post('/bulk-verify-warranty', upload.single('billPdf'), async (req, res) => {
//     const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber } = req.body;
//     const warranties = [];
//     const expiryDate = expiryyear;
//     const billPdfPath = req.file.path;

//     // Loop through each computer and extract the serial number and model number
//     for (let i = 1; i <= numComputers; i++) {
//         const serialNumber = req.body[`serialNumber${i}`];
//         const model = req.body[`model${i}`];

//         // Add the warranty data to the array
//         warranties.push({
//             expiryDate,
//             name,
//             email,
//             purchaseDate,
//             address,
//             city,
//             pincode,
//             state,
//             phoneNumber,
//             serialNumber,
//             model,
//             billPdf: billPdfPath,
//         });
//     }

//     try {
//         // Check for existing serial numbers in the database
//         const existingWarranties = await Warranty.find({
//             serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
//         });

//         const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);

//         // If there are any duplicates, do not insert anything into the database
//         if (existingSerialNumbers.length > 0) {
//             res.status(409).send(`Warranty registration request unsuccessful because warranty for serial number <b>${existingSerialNumbers.join(', ')}</b> already exists. Please enter correct serial numbers.`);
//         } else {
//             // Insert new warranties
//             await Warranty.insertMany(warranties);

//             // Prepare the response
//             const response = {
//                 success: warranties.map(warranty => warranty.serialNumber)
//             };

//             // Send email with PDF attachment
//         async function sendMail() {
//             const info = await transporter.sendMail({
//                 from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
//                 to: `"Recipient" <${email}>`,
//                 subject: " Warranty Verification",
//                 text: `Dear Bitbox PC User,
//                 Your warranty Registration is done sucessfully, We'll verify it and notify you as soon as possibel .
                
//                 Regards,
//                 Team Support
//                 BitBox`,
//                 html: `<b>Your warranty Registration is done sucessfully, We'll verify it and notify you as soon as possibel</b> <br>
//                 <br>
//                 <br><br>Thank you for choosing BitBox. <br><br>
//                 Regards,<br>
//                 Team Bitbox
//                 <br><br>
//                 Toll Free: 1800309PATA <br>
//                 eMail: <a href="">support@bitboxpc.com </a> <br>
//                 web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
//                 <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`,
//                 attachments: [
//                     {
//                         filename: `bulk-warranty-verification-${batch}.pdf`,
//                         path: result.filename,
//                     },
//                 ],
//             });

//             console.log('Message sent: %s', info.messageId);
//         }
//         await sendMail();

//             res.status(201).send(`Warranty registration successful for: <b>${response.success.join(', ')}</b>`);
//         }
//     } catch (error) {
//         console.error('Error verifying warranties:', error);
//         res.status(500).send('Error verifying warranties');
//     }
// });


//send notifction to the user whose warrenty expiring
app.get('/send-notification', async (req, res) => {
    const { email,serialNumber,expiryDate } = req.query; // Extract email from query parameters
            // Option 2: Using toLocaleDateString with specific options to get 'Fri Jun 20 2025'
    // Convert expiryDate from string to Date object
    const expiryDateObj = new Date(expiryDate);

    // Option 2: Using toLocaleDateString with specific options to get 'Fri Jun 20 2025'
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate2 = expiryDateObj.toLocaleDateString(undefined, options);
    try {
        // Send email using nodemailer transporter
        const info = await transporter.sendMail({
            from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
            to: email,
            subject: 'Warranty Expiring Alert',
            text: 'This is a notification email.',
            html: `<p>Dear Customer,</p> <br> Your Warranty for serial number ${serialNumber} is expiring on ${formattedDate2} <br> Please connect with us on support@bitboxpc.com to renew your warranty <br><br>Thank you for choosing BitBox. <br><br>
                    Best Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    E-mail: <a href="">support@bitboxpc.com </a> <br>
                    web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`
           
        });

        console.log('Notification email sent:', info.messageId);
        res.sendStatus(200); // Respond with success status
    } catch (error) {
        console.error('Error sending notification email:', error);
        res.status(500).send('Error sending notification email');
    }
});


// Route to delete a serial number
app.post('/delete-serial', async (req, res) => {
    const { serialNumber, modelNumber } = req.body;
    try {
        await SerialNumber.deleteOne({ serialNumber, modelNumber });
        res.redirect('/admin/dashboard'); // Redirect to admin page after deleting
    } catch (error) {
        console.error('Error deleting serial number:', error);
        res.status(500).send('Error deleting serial number');
    }
});

//Admin Login
app.post('/admin/login', (req, res) => {
    const { adminType, username, password } = req.body;

    // Define temporary usernames and passwords for SuperAdmin, DriverAdmin, WarrantyAdmin, and InventoryAdmin
    const credentials = {
        SuperAdmin: { username: 'SuperAdmin', password: 'Bitbox@000777' },
        DriverAdmin: { username: 'DriverAdmin', password: 'Bitbox@000777' },
        WarrantyAdmin: { username: 'WarrantyAdmin', password: 'Bitbox@000777' },
        InventoryAdmin: { username: 'InventoryAdmin', password: 'Bitbox@000777' }
    };

    if (credentials[adminType] && username === credentials[adminType].username && password === credentials[adminType].password) {
        req.session.isAuthenticated = true;
        switch (adminType) {
            case 'SuperAdmin':
                res.redirect('/admin/dashboard');
                break;
            case 'DriverAdmin':
                res.redirect('/admin/driver-admin');
                break;
            case 'WarrantyAdmin':
                res.redirect('/admin/warranty-admin');
                break;
            case 'InventoryAdmin':
                res.redirect('/admin/inventory-admin');
                break;
            default:
                res.send('Invalid admin type');
        }
    } else {
        res.send('Invalid credentials');
    }
});


// Admin dashboard routes
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        const warranties = await Warranty.find();
        const serials = await SerialNumber.find();
        res.render('admin/dashboard', { drivers, warranties, serials });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});


//Render Driver add page
app.get('/admin/driver-admin', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.render('admin/driver-admin', { drivers });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});
//Render warenty admin
app.get('/admin/warranty-admin', isAuthenticated, async (req, res) => {
    try {
        const warranties = await Warranty.find();
        res.render('admin/warranty-admin', { warranties });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});
//Render inventory admin
app.get('/admin/inventory-admin', isAuthenticated, async (req, res) => {
    try {
        const serials = await SerialNumber.find();
        res.render('admin/inventory-admin', { serials });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});


//Render Upload Driver Route
app.get('/admin/drivers/upload', isAuthenticated, (req, res) => {
    res.render('admin/upload');
});

//Uplode Driver
app.post('/admin/drivers/upload', isAuthenticated, upload.single('driverFile'), async (req, res) => {
    try {
        const { model, version, date } = req.body;
        const downloadLink = `/uploads/${req.file.filename}`;

        // Create and save the new driver
        const newDriver = new Driver({ model, version, downloadLink, date });
        await newDriver.save();

        // Fetch all users with the same model
        const usersToLogOut = await Warranty.find({ model: new RegExp(`^${model}$`, 'i') });


        // Log out each user
        for (const user of usersToLogOut) {
            try {
                await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${user.email}>`,
                    subject: "New Driver Update Alert",
                    text: `Dear ${user.name},
                    New Driver For Your Model ${model} has been added with version ${version}
            
                    Regards,
                    Team Support
                    BitBox`,
                    html: `<b>Dear Customer, <br> We are excited to announce that a new driver update is available for your machine ${model} with version - ${version} </br>! To ensure your BitBox PC remains up-to-date and performs at its best, please download the latest update.
                    <br><br>
                    To download the latest driver update :
                    <br>
                    1.Visit : support.bitboxpc.com 
                    <br>
                    2.Click on “Check Your Device Info”
                    <br>
                    3.Download the Latest Driver
                     
                    <br><br>Thank you for choosing BitBox. <br><br>
                    Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    eMail: <a href="">support@bitboxpc.com </a> <br>
                    web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="80" width="150"></img>

                    `,
                });
            } catch (error) {
                console.error('Error sending email to user:', error);
            }
        }

        res.send('<script>alert("Driver Uploaded Successfully."); window.history.back();</script>');
    } catch (error) {
        console.error('Error uploading driver:', error);
        res.status(500).send('Error uploading driver');
    }
});



// Delete Driver Route
app.post('/admin/drivers/delete/:id', isAuthenticated, async (req, res) => {
    const driverId = req.params.id;
    try {
        await Driver.findByIdAndDelete(driverId);
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).send('Error deleting driver');
    }
});

// View All Drivers Route
app.get('/admin/drivers', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.render('admin/drivers', { drivers });
    } catch (error) {
        res.status(500).send('Error fetching drivers');
    }
});


const generateOTP = () => {return Math.floor(100000 + Math.random() * 900000).toString();};
//Send OTP
app.post('/send-otp', async (req, res) => {
    const { serial } = req.body;
    if (!serial) {
        return res.status(400).json({ message: 'Serial number is required' });
    }

    try {
        const otp = generateOTP();
        const certificate = await Certificate.findOneAndUpdate(
            { serialNumber: serial },
            { OTP: otp },
            { new: true }
        );

        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const warranty = await Warranty.findOne({ serialNumber: serial });
        const email = warranty.email; 
        try {
            // Send email using nodemailer transporter
            const info = await transporter.sendMail({
                from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                to: email,
                subject: 'OTP Verification For Certificate Download',
                text: 'Please find attached OTP.',
                html: `Dear Customer,  <br> 
                        To ensure the security of your certificate download, we have implemented an OTP (One-Time Password) verification process. This additional layer of security safeguards your information and guarantees secure access to your certificates.  
                        <br>
                        <h1>OPT  for the machine ${serial}  : <span style="color:orange"> ${otp} </span> </h1>
                        <br>
                        *Enter the OTP on the certificate download page to proceed. 
                        <br><br>

                        Thank you for your cooperation in maintaining the security of your data. If you have any questions or need assistance, please don't hesitate to contact our support team at support@bitboxpc.com.   
   
                        Best Regards,<br>
                        Team Bitbox
                        <br><br>
                        Toll Free: 1800309PATA <br>
                        E-mail: <a href="">support@bitboxpc.com </a> <br>
                        web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                        <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`
               
            });
    
           
            
        } catch (error) {
            console.error('Error sending notification email:', error);
            res.status(500).send('Error sending notification email');
        }
        
        const maskedEmail = maskEmail(email);
        // Here you can implement sending the OTP to the user via email or SMS

        res.json({ message: 'OTP sent successfully', otp, maskedEmail });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
function maskEmail(email) {
    const [localPart, domain] = email.split('@');
    const maskedLocalPart = localPart.slice(0, 2) + '*****' + localPart.slice(-1);
    return `${maskedLocalPart}@${domain}`;
}

//Verify OTP
app.post('/verify-otp', async (req, res) => {
    const { serial, otp } = req.body;
    if (!serial || !otp) {
        return res.status(400).json({ message: 'Serial number and OTP are required' });
    }

    try {
        const certificate = await Certificate.findOne({ serialNumber: serial, OTP: otp });

        if (!certificate) {
            return res.status(404).json({ message: 'Invalid OTP or Serial Number' });
        }

         
        res.json({ message: 'OTP verified successfully', certificateLink: certificate.certificateLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//reseller feth
app.get('/resellers', async (req, res) => {
    try {
        const resellers = await Reseller.find();
        res.status(200).json({ resellers });
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});

// Endpoint to get all resellers
app.get('/resellers2', async (req, res) => {
    try {
        const resellers = await Reseller.find();
        res.json(resellers);
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});

// Route to add a new reseller
app.post('/add-reseller', async (req, res) => {
    const { name, email } = req.body;

    try {
        const newReseller = new Reseller({ name, email });
        await newReseller.save();
        res.status(201).send('Reseller added successfully');
    } catch (error) {
        console.error('Error adding reseller:', error);
        res.status(500).send('Error adding reseller');
    }
});

app.delete('/delete-reseller/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await Reseller.findByIdAndDelete(id);
        res.status(200).send('Reseller deleted successfully');
    } catch (error) {
        console.error('Error deleting reseller:', error);
        res.status(500).send('Error deleting reseller');
    }
});


// Logout Route
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/admin');
    });
});

app.listen(port, () => {
    console.log(`Server is running`);
});
