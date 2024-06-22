# Device Information Fetching Project

This project aims to fetch device information (manufacturer, model, serial number, and operating system) from client machines using executable scripts and display it on a web interface. The project includes server-side code to handle requests, serve the scripts, and process the fetched data. The frontend provides users with the option to download and run the scripts to collect their device information.

## Table of Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Usage](#usage)
5. [File Structure](#file-structure)
6. [Contributing](#contributing)
7. [License](#license)

## Features

- Fetches device information using executable scripts.
- Supports Windows, Linux, and Mac OS.
- Displays device information on a web interface.
- Uses MongoDB for database operations.
- Allows warranty registration with file uploads.
- Sends confirmation emails using NodeMailer.

## Requirements

- Node.js (v14.x or later)
- MongoDB
- npm (Node package manager)

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/device-info-fetcher.git
   cd device-info-fetcher
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up MongoDB:
   Make sure MongoDB is running on your local machine or set up a MongoDB Atlas cluster. Update the MongoDB connection string in `server.js` if necessary.

4. Build the executable scripts:
   ```sh
   npm install -g pkg
   pkg scripts/fetchSystemInfo.js --targets node14-win-x64,node14-linux-x64,node14-macos-x64 --output scripts/fetchSystemInfo
   mv scripts/fetchSystemInfo-win.exe scripts/fetchSystemInfo.exe
   mv scripts/fetchSystemInfo-linux scripts/fetchSystemInfoLinux
   mv scripts/fetchSystemInfo-macos scripts/fetchSystemInfoMac
   ```

5. Update email configuration:
   In `server.js`, update the email configuration for NodeMailer with your email credentials.

## Usage

1. Start the server:
   ```sh
   node server.js
   ```

2. Open your web browser and go to:
   ```
   http://localhost:7780
   ```

3. Navigate to the "Check Device" page and follow the instructions to download and run the script for your operating system.

4. The script will fetch the device information and send it back to the server. The information will then be displayed on the web interface.

## File Structure

```
device-info-fetcher/
├── models/
│   ├── Driver.js
│   └── Warranty.js
├── public/
│   └── (static files)
├── scripts/
│   ├── fetchSystemInfo.js
│   ├── fetchSystemInfo.exe
│   ├── fetchSystemInfoLinux
│   └── fetchSystemInfoMac
├── system-info/
│   └── (system information files)
├── views/
│   ├── check-device.ejs
│   ├── index.ejs
│   ├── latest-driver.ejs
│   └── register-warranty.ejs
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```

## Notes

- Ensure you have the necessary permissions to run the executable scripts on your operating system.
- The server should handle appropriate security and error checks for production use.
- The example email configuration uses Gmail. You may need to configure less secure app access or use app-specific passwords.

---

Feel free to customize this `README.md` according to your project's specifics and requirements.