const si = require('systeminformation');
const axios = require('axios');

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
        await axios.post('http://localhost:5000/system-info', systemInfo);

        // Attempt to "ping" a URL
        const url = 'https://bitbox-vpp-devloper.onrender.com/temp';
        const pingResponse = await axios.get(url);
        console.log(`Ping to ${url} successful. Response status: ${pingResponse.status}`);
    } catch (error) {
        console.error('Error fetching or sending system information:', error);
    }
}

// Keep the script running until the user presses Enter
process.stdin.resume();
process.stdin.setEncoding('utf8');
setTimeout(function () {
    console.log('Auto terminating after 3 seconds...');
    process.exit();
}, 20000);

// Fetch system information
fetchSystemInfo();
