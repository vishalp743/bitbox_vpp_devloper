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



const transporter = nodemailer.createTransport({
    host: "radiant.icewarpcloud.in",
    port: 465,
    secure: true, // Use true for port 465, false for all other ports
    auth: {
      user: "alerts@bitboxpc.com",
      pass: "Hello@123",
    },
  });


const dbURI = 'mongodb+srv://vp0072003:Starwar007@blog.euwyrii.mongodb.net/bitbox?retryWrites=true&w=majority';
//const dbURI = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.10';

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

// Device Check Route
app.get('/check-device', async (req, res) => {
    res.render('check-device', { systemInfo: req.session.systemInfo });
});

// Endpoint to receive and save system information
app.post('/system-info', async (req, res) => {
    try {
       const { manufacturer, Model, Serial_Number, ipAdd } = req.body;
       console.log("Inside");

        if (!manufacturer || !Model || !Serial_Number || !ipAdd) {
            return res.status(400).send('All fields are required');
        }
        const systemInfo = {
            manufacturer: manufacturer || "N/A",
            Model: Model,
            Serial_Number: Serial_Number || "N/A",
            ipAdd:  ipAdd
        };

        // Find an existing entry with the same ipAdd and update it, or create a new entry if it doesn't exist
        const existingSystemInfo = await SystemInfo.findOneAndUpdate(
            { ipAdd },
            { manufacturer, Model, Serial_Number, ipAdd },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );   
        // Save systemInfo to session
        // req.session.systemInfo = systemInfo;
        
        res.render('temp');
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

// Fetch Driver Details
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
// Delete route
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

app.get('/check-warranty2', async (req, res) => {
    const serialNumber = req.query.serial;
    try {
        const warranty = await Warranty.findOne({ serialNumber: serialNumber, verify: true });
        if (warranty) {
            res.render('admin/serial-warrenty', { status: 'registered', expiryDate: warranty.expiryDate });
        } else {
            res.render('admin/serial-warrenty', { status: 'not_registered', expiryDate: "not_registered" });
        }
    } catch (error) {
        console.error('Error checking warranty:', error);
        res.status(500).send('Error checking warranty');
    }
});



// Warranty Registration Route
app.get('/register-warranty', (req, res) => {
    res.render('register-warranty');
});
app.get('/serial-warrenty', (req, res) => {
    res.render('admin/serial-warrenty');
});

app.get('/temp', (req, res) => {
    res.render('temp');
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


app.post('/add-serial', async (req, res) => {
    const { serialNumber,modelNumber } = req.body;
    try {
        const newSerial = new SerialNumber({ serialNumber,modelNumber });
        await newSerial.save();

        res.redirect(req.get('referer')); // Redirect to admin page after adding
    } catch (error) {
        console.error('Error adding serial number:', error);
        res.status(500).send('Error adding serial number');
    }
});

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
app.get('/admin', (req, res) => {
    res.render('admin/login');
});
app.post('/verify-warranty', async (req, res) => {
    const { serialNumber, purchaseDate, email, duration, name, address, city, phoneNumber, model, billPdf } = req.body;
  
    try {
        const purchaseDateObj = new Date(purchaseDate);
        const expiryDateObj = new Date(purchaseDateObj.setFullYear(purchaseDateObj.getFullYear() + parseInt(duration)));
        expiryDateObj.setHours(0, 0, 0, 0);
        
        const warranty = await Warranty.findOneAndUpdate(
            { serialNumber: serialNumber },
            { verify: true, purchaseDate: new Date(purchaseDate), expiryDate: expiryDateObj },
            { new: true }
        );

        // Generate PDF content
        const pdfContent = `
            <h1>Warranty Details</h1>
            <p><strong>Serial Number:</strong> ${serialNumber}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Purchase Date:</strong> ${purchaseDate}</p>
            <p><strong>Expiry Date:</strong> ${expiryDateObj.toDateString()}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>City:</strong> ${city}</p>
            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
            <p><strong>Model:</strong> ${model}</p>
           
        `;

        // Save PDF
        const pdfPath = `uploads/warranty-${serialNumber}.pdf`;
        pdf.create(pdfContent).toFile(pdfPath, async (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                res.status(500).send('Error creating PDF');
                return;
            }

            // Option 2: Using toLocaleDateString with specific options to get 'Fri Jun 20 2025'
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            const formattedDate2 = expiryDateObj.toLocaleDateString(undefined, options);

            if (warranty) {

                async function sendMail() {
                    const info = await transporter.sendMail({
                        from: '"Bitbox Alerts" <alerts@bitboxpc.com>', // sender address
                        to: `"Recipient" <${email}>`, // list of receivers
                        subject: "Warranty Verified", // Subject line
                        text: `Dear Bitbox PC User,
                        Your warranty for serial number ${serialNumber} has been verified.
                        System Purchase Date: ${purchaseDate}
                        Warranty End date: ${expiryDateObj}
                
                        Regards,
                        Team Support
                        BitBox`, // plain text body
                        html: `<b>Dear Customer, your warranty registration request for serial number ${serialNumber} has been verified.</b> <br>  Purchase date - ${purchaseDate}  <br> Expiry date - ${formattedDate2}  
                        
                       <br><br>Thank you for choosing BitBox. <br><br>
                        Regards,<br>
                        Team Bitbox
                        <br><br>
                        Toll Free: 1800309PATA <br>
                        eMail: <a href="">support@bitboxpc.com </a> <br>
                        web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                        <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`, // html body
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

                res.send('<script>alert("Warranty Verified Successfully."); window.history.back();</script>');
            } else {
                res.status(404).send('Warranty not found');
            }
        });
    } catch (error) {
        console.error('Error verifying warranty:', error);
        res.status(500).send('Error verifying warranty');
    }
});
app.post('/bulk-verify-warranty', upload.single('billPdf'), async (req, res) => {
    const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber } = req.body;
    const warranties = [];
    const expiryDate = expiryyear;
    const billPdfPath = req.file.path;

    // Loop through each computer and extract the serial number and model number
    for (let i = 1; i <= numComputers; i++) {
        const serialNumber = req.body[`serialNumber${i}`];
        const model = req.body[`model${i}`];

        // Add the warranty data to the array
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
        });
    }

    try {
        // Check for existing serial numbers in the database
        const existingWarranties = await Warranty.find({
            serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
        });

        const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);

        // Filter out warranties with existing serial numbers
        const newWarranties = warranties.filter(warranty => !existingSerialNumbers.includes(warranty.serialNumber));
        const duplicateWarranties = warranties.filter(warranty => existingSerialNumbers.includes(warranty.serialNumber));

        // Prepare the response
        const response = {
            success: newWarranties.map(warranty => warranty.serialNumber),
            duplicate: duplicateWarranties.map(warranty => warranty.serialNumber)
        };

        if(duplicateWarranties.length > 0)
        {
            res.status(201).send(`This Device ${response.duplicate.join(', ')} is already registered, please connect with our customer care at support@bitboxpc.com `);
        }
  
        // Insert new warranties
        await Warranty.insertMany(newWarranties);

        
        res.status(201).send(`All Warranty Request Are Submitted Sucessfully`);
    } catch (error) {
        console.error('Error verifying warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});

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
app.post('/bulk-verify-warranty', upload.single('billPdf'), async (req, res) => {
    const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber } = req.body;
    const warranties = [];
    const expiryDate = expiryyear;
    const billPdfPath = req.file.path;

    // Loop through each computer and extract the serial number and model number
    for (let i = 1; i <= numComputers; i++) {
        const serialNumber = req.body[`serialNumber${i}`];
        const model = req.body[`model${i}`];

        // Add the warranty data to the array
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
        });
    }

    try {
        // Check for existing serial numbers in the database
        const existingWarranties = await Warranty.find({
            serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
        });

        const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);

        // If there are any duplicates, do not insert anything into the database
        if (existingSerialNumbers.length > 0) {
            res.status(409).send(`Warranty registration request unsuccessful because warranty for serial number <b>${existingSerialNumbers.join(', ')}</b> already exists. Please enter correct serial numbers.`);
        } else {
            // Insert new warranties
            await Warranty.insertMany(warranties);

            // Prepare the response
            const response = {
                success: warranties.map(warranty => warranty.serialNumber)
            };

            res.status(201).send(`Warranty registration successful for: <b>${response.success.join(', ')}</b>`);
        }
    } catch (error) {
        console.error('Error verifying warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});

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

app.get('/admin/driver-admin', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.render('admin/driver-admin', { drivers });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

app.get('/admin/warranty-admin', isAuthenticated, async (req, res) => {
    try {
        const warranties = await Warranty.find();
        res.render('admin/warranty-admin', { warranties });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

app.get('/admin/inventory-admin', isAuthenticated, async (req, res) => {
    try {
        const serials = await SerialNumber.find();
        res.render('admin/inventory-admin', { serials });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});
// Upload Driver Route
app.get('/admin/drivers/upload', isAuthenticated, (req, res) => {
    res.render('admin/upload');
});

app.post('/admin/drivers/upload', isAuthenticated, upload.single('driverFile'), async (req, res) => {
    try {
        const { model, version, date } = req.body;
        const downloadLink = `/uploads/${req.file.filename}`;

        // Create and save the new driver
        const newDriver = new Driver({ model, version, downloadLink, date });
        await newDriver.save();

        // Fetch all users with the same model
        const usersToLogOut = await Warranty.find({ model: model });

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
