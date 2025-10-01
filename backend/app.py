from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash,check_password_hash
from pymongo import MongoClient
from ultralytics import YOLO
import numpy as np
import cv2
from dotenv import load_dotenv
import os

load_dotenv()
mongodb_uri = os.getenv("MONGODB_URI")
app = Flask(__name__)
CORS(app)

# MongoDB Atlas
client = MongoClient(mongodb_uri)
# print(client.list_database_names())
db = client['user-info']
users_collection = db['users']
db_blogs=client['blogs']
blogs_collection=db_blogs['blog-info']
# # -------- Signup API --------
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')

    if not full_name or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    # Check if email already exists
    if users_collection.find_one({"email": email}):
        return jsonify({"message": "Email already exists"}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    # Insert into MongoDB
    users_collection.insert_one({
        "full_name": full_name,
        "email": email,
        "password": hashed_password
    })

    return jsonify({"message": "User created successfully!"}), 201

@app.route("/api/login",methods=['POST'])
def login():
    # Get JSON data from request
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Check if user exists and password matches
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Check hashed password
    if check_password_hash(user["password"], password):
        return jsonify({"message": "Login successful", "email": email, "full_name": user["full_name"]}), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

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

    # Read image into numpy array (BGR)
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Failed to read image"}), 400

    # Run YOLO model
    results = model(img)

    response_boxes = []
    if results and len(results[0].boxes) > 0:
        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            response_boxes.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "confidence": conf
            })

    return jsonify({"detections": response_boxes})

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
if __name__ == '__main__':
    app.run(debug=True)
