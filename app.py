from flask import Flask, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/get_local_ip', methods=['GET'])
def get_local_ip():
    try:
        # Run the Python script and capture the output
        result = subprocess.run(['python', 'get_local_ip.py'], capture_output=True, text=True)
        output = result.stdout.strip()
        ip_data = json.loads(output)
        return jsonify(ip_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
