const express = require('express');
const si = require('systeminformation');
const axios = require('axios');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');

async function fetchSystemInfo() {
    try {
        const system = await si.chassis();
        const system2 = await si.system();

        // Generate a random number
        const randomNumber = Math.floor(Math.random() * 10000);

        const systemInfo = {
            manufacturer: system.manufacturer || "N/A",
            Model: system2.model,
            Serial_Number: system.assetTag || "N/A",
            ipAdd: randomNumber // Store the random number in ipAdd
        };
        console.log(systemInfo);

        // Send system information to the server
        await axios.post('https://bitbox-vpp-devloper.onrender.com/system-info', systemInfo);

        // Render the EJS file after storing data into the database
        app.render('temp', { randomNumber }, (err, html) => {
            if (err) {
                console.error('Error rendering EJS file:', err);
                return;
            }
            console.log(html); // Log the rendered HTML (optional)
        });
    } catch (error) {
        console.error('Error fetching or sending system information:', error);
    }
}

// Fetch system information
fetchSystemInfo();

// Start the Express server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
