import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from ultralytics import YOLO
import numpy as np
import cv2
import requests 
from dotenv import load_dotenv 

app = Flask(__name__)
CORS(app)

# Load environment variables from the .env file
load_dotenv() 

# -------- Secure MongoDB Setup --------
MONGO_URI = os.getenv('MONGO_URI') 
WEATHERBIT_API=os.getenv("WEATHERBIT_API_KEY")
if not MONGO_URI:
    raise ValueError("No MONGO_URI found in environment variables. Please set it in your .env file.")

client = MongoClient(MONGO_URI) 
db = client['user-info']
users_collection = db['users']
db_blogs=client['blogs']
blogs_collection=db_blogs['blog-info']

# Get OpenWeatherMap API Key
# OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY") 
# if not OPENWEATHER_API_KEY:
#     raise ValueError("No OPENWEATHER_API_KEY found in environment variables. Please set it in your .env file.")


# -------- Signup API --------
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')

    if not full_name or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"message": "Email already exists"}), 400

    hashed_password = generate_password_hash(password)
    users_collection.insert_one({
        "full_name": full_name,
        "email": email,
        "password": hashed_password
    })
    return jsonify({"message": "User created successfully!"}), 201

# -------- Login API --------
@app.route("/api/login", methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    if check_password_hash(user["password"], password):
        return jsonify({"message": "Login successful", "email": email, "full_name": user["full_name"]}), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

# -------- Lesion Detection API --------
model = YOLO("models/yolov8s_e100.pt")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/upload", methods=["POST"])
def detect_lesion():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Failed to read image"}), 400
    results = model(img)
    response_boxes = []
    if results and len(results[0].boxes) > 0:
        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            response_boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "confidence": conf})
    return jsonify({"detections": response_boxes})

# -------- Weather API --------
@app.route("/api/weather", methods=["POST"])
def get_weather():
    data = request.get_json()
    latitude = data.get('lat')
    longitude = data.get('lon')

    if not latitude or not longitude:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    try:
        open_weather_url= (f"https://api.weatherbit.io/v2.0/current?lat={latitude}&lon={longitude}&key={WEATHERBIT_API}&include=minutely")
        response = requests.get(open_weather_url)
        response.raise_for_status()
        
        weather_data = response.json()
        current_weather = weather_data.get('data', {})[0]
        temp = current_weather.get('temp')
        uvi = current_weather.get('uv')

        if temp is None or uvi is None:
            return jsonify({"error": "Weather data is incomplete from the external API"}), 500

        return jsonify({"temp": temp, "uvi": uvi}), 200

    except requests.exceptions.RequestException as e:
        print(f"Error fetching from OpenWeatherMap: {e}")
        return jsonify({"error": "Failed to fetch weather data from external service"}), 502
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An unexpected server error occurred"}), 500

    
@app.route("/api/blogs",methods=['GET'])
def get_blogs():
    try:
        # Fetch all blogs sorted by creation date (newest first)
        blogs_cursor = blogs_collection.find().sort("created_at", -1)
        blogs_list = []
        for blog in blogs_cursor:
            blogs_list.append({
                "_id": str(blog["_id"]),  # ObjectId -> string
                "title": blog.get("title"),
                "slug": blog.get("slug"),
                "category": blog.get("category"),
                "summary": blog.get("summary"),
                "tags": blog.get("tags", []),
                "content": blog.get("content", []),
                "references": blog.get("references", []),
                "created_at": blog.get("created_at"),
                "updated_at": blog.get("updated_at")
            })
        return jsonify(blogs_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def serialize_blog(blog):
    return {
        "_id": str(blog["_id"]),
        "title": blog.get("title"),
        "slug": blog.get("slug"),
        "category": blog.get("category"),
        "summary": blog.get("summary"),
        "tags": blog.get("tags", []),
        "content": blog.get("content", []),
        "references": blog.get("references", []),
        "image_url": blog.get("image_url"),
        "created_at": blog.get("created_at"),
        "updated_at": blog.get("updated_at")
    }

@app.route("/api/blogs/<slug>", methods=['GET'])
def get_blog_by_slug(slug):
    try:
        blog = blogs_collection.find_one({"slug": slug})
        if not blog:
            return jsonify({"error": "Blog not found"}), 404
        return jsonify(serialize_blog(blog)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------- Main Execution --------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)