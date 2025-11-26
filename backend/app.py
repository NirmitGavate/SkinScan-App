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
from bson import ObjectId
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Load environment variables from the .env file
load_dotenv() 

# -------- Secure MongoDB Setup --------
MONGO_URI = os.getenv('MONGO_URI') 
WEATHERBIT_API = os.getenv("WEATHERBIT_API_KEY")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

if not MONGO_URI:
    raise ValueError("No MONGO_URI found in environment variables. Please set it in your .env file.")

client = MongoClient(MONGO_URI) 
db = client['user-info']
users_collection = db['users']
db_blogs = client['blogs']
blogs_collection = db_blogs['blog-info']
profile_info = client['profile']['profile-info']
profiles_collection = db['profiles']

# -------- YOLO Model Setup --------
model = YOLO("models/yolov8s_e100.pt")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# -------- JSON Encoder --------
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super(JSONEncoder, self).default(obj)

app.json_encoder = JSONEncoder

# -------- Home Route --------
@app.route('/')
def home():
    return "SkinScan Backend is Running!"

# -------- User Authentication Routes --------
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
        open_weather_url = f"https://api.weatherbit.io/v2.0/current?lat={latitude}&lon={longitude}&key={WEATHERBIT_API}&include=minutely"
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

# -------- Blog Routes --------
@app.route("/api/blogs", methods=['GET'])
def get_blogs():
    try:
        blogs_cursor = blogs_collection.find().sort("created_at", -1)
        blogs_list = []
        for blog in blogs_cursor:
            blogs_list.append({
                "_id": str(blog["_id"]),
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

# -------- Nearby Hospitals API --------
@app.route("/api/nearby-hospitals", methods=["POST"])
def get_nearby_hospitals():
    print("🔄 Nearby hospitals endpoint called")
    
    data = request.get_json()
    latitude = data.get('lat')
    longitude = data.get('lon')
    radius = data.get('radius', 5000)

    if not latitude or not longitude:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    if not GOOGLE_PLACES_API_KEY:
        return jsonify({"error": "Google Places API key not configured"}), 500

    try:
        places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f'{latitude},{longitude}',
            'radius': radius,
            'type': 'hospital',
            'keyword': 'cancer oncology',
            'key': GOOGLE_PLACES_API_KEY
        }
        
        response = requests.get(places_url, params=params)
        response.raise_for_status()
        
        places_data = response.json()
        
        if places_data.get('status') != 'OK':
            return jsonify({"error": f"Google Places API error: {places_data.get('status')}"}), 400

        hospitals = []
        for place in places_data.get('results', [])[:10]:
            hospital_info = {
                'name': place.get('name'),
                'address': place.get('vicinity', 'Address not available'),
                'rating': place.get('rating'),
                'place_id': place.get('place_id'),
                'location': place.get('geometry', {}).get('location', {}),
                'open_now': place.get('opening_hours', {}).get('open_now')
            }
            
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                'place_id': place.get('place_id'),
                'fields': 'formatted_phone_number,website',
                'key': GOOGLE_PLACES_API_KEY
            }
            
            try:
                details_response = requests.get(details_url, params=details_params)
                details_data = details_response.json()
                if details_data.get('status') == 'OK':
                    result = details_data.get('result', {})
                    hospital_info['phone'] = result.get('formatted_phone_number')
                    hospital_info['website'] = result.get('website')
            except Exception as e:
                print(f"Error fetching details for {place.get('name')}: {e}")
            
            hospitals.append(hospital_info)

        print(f"✅ Found {len(hospitals)} hospitals")
        return jsonify({"hospitals": hospitals}), 200

    except requests.exceptions.RequestException as e:
        print(f"❌ Google Places API error: {e}")
        return jsonify({"error": "Failed to fetch hospital data"}), 502
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return jsonify({"error": "An unexpected server error occurred"}), 500

# -------- Profile Management Routes --------
@app.route('/api/profile/update_skin_tone', methods=['POST'])
def api_update_skin_tone():
    try:
        data = request.json
        username = data.get('username')
        fitzpatrick_level = data.get('fitzpatrickLevel')
        
        print(f"🔄 Updating skin tone for user: {username} to level: {fitzpatrick_level}")
        
        if not username or fitzpatrick_level is None:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Update in MongoDB - profile database
        db_profile = client['profile']
        profile_info = db_profile['profile-info']
        
        result = profile_info.update_one(
            {'userId': username},
            {'$set': {
                'skinProfile.fitzpatrickLevel': fitzpatrick_level,
                'updatedAt': datetime.utcnow()
            }},
            upsert=True  # Create if doesn't exist
        )
        
        print(f"✅ MongoDB update result - Matched: {result.matched_count}, Modified: {result.modified_count}")
        
        return jsonify({
            'success': True, 
            'message': 'Skin tone updated successfully',
            'fitzpatrickLevel': fitzpatrick_level
        })
    
    except Exception as e:
        print(f"❌ Error updating skin tone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/profile/update', methods=['POST'])
def api_update_profile():
    try:
        data = request.json
        username = data.get('username')
        
        print(f"🔄 Updating profile for: {username}")
        print(f"📦 Received data: {data}")
        
        if not username:
            return jsonify({'success': False, 'error': 'Username is required'}), 400
        
        # Use profile database
        db_profile = client['profile']
        profile_info = db_profile['profile-info']
        
        update_data = {
            'userId': username,
            'personalInfo': {
                'name': data.get('username', ''),
                'email': data.get('email', '')
            },
            'skinProfile': {
                'fitzpatrickLevel': data.get('fitzpatrickLevel', 3),
                'skinType': data.get('skinType', ''),
                'conditions': data.get('skinConditions', [])
            },
            'updatedAt': datetime.utcnow()
        }
        
        # Check if profile exists
        existing_profile = profile_info.find_one({'userId': username})
        if not existing_profile:
            update_data['createdAt'] = datetime.utcnow()
            print("🆕 Creating new profile document")
        else:
            print("📝 Updating existing profile document")
        
        result = profile_info.update_one(
            {'userId': username},
            {'$set': update_data},
            upsert=True
        )
        
        print(f"✅ Profile update successful - Matched: {result.matched_count}, Modified: {result.modified_count}")
        
        # Verify the update
        updated_profile = profile_info.find_one({'userId': username})
        print(f"🔍 Updated profile in DB: {updated_profile}")
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    
    except Exception as e:
        print(f"❌ Error updating profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/profile/<username>', methods=['GET'])
def api_get_profile(username):
    try:
        print(f"🔍 Fetching profile for: {username}")
        
        # Use profile database
        db_profile = client['profile']
        profile_info = db_profile['profile-info']
        
        profile = profile_info.find_one({'userId': username})
        
        if not profile:
            print("❌ Profile not found, returning default")
            return jsonify({
                'success': True, 
                'profile': {
                    'userId': username,
                    'personalInfo': {'name': '', 'email': ''},
                    'skinProfile': {'fitzpatrickLevel': 3, 'skinType': '', 'conditions': []}
                }
            })
        
        # Convert ObjectId to string for JSON serialization
        if '_id' in profile:
            profile['_id'] = str(profile['_id'])
        
        print(f"✅ Profile found: {profile}")
        return jsonify({'success': True, 'profile': profile})
    
    except Exception as e:
        print(f"❌ Error fetching profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
# -------- Legacy Profile APIs (Keep for compatibility) --------
@app.route('/api/profile', methods=['POST'])
def create_user_profile():
    try:
        data = request.json
        age = data.get('age')
        gender = data.get('gender')
        skin_fairness = data.get('skinFairness')

        if not age or not gender or skin_fairness is None:
            return jsonify({"error": "All fields are required"}), 400

        if gender not in ['male', 'female', 'other']:
            return jsonify({"error": "Invalid gender"}), 400

        if skin_fairness not in [1, 2, 3, 4, 5, 6]:
            return jsonify({"error": "Invalid skin fairness value"}), 400

        profile_data = {
            "age": age,
            "gender": gender,
            "skinFairness": skin_fairness,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = profiles_collection.insert_one(profile_data)
        profile_data['_id'] = result.inserted_id
        
        return jsonify(profile_data), 201

    except Exception as e:
        print(f"Error creating profile: {e}")
        return jsonify({"error": "Failed to create profile"}), 500

@app.route('/api/profile/<profile_id>', methods=['PUT'])
def update_legacy_profile(profile_id):
    try:
        data = request.json
        
        if not ObjectId.is_valid(profile_id):
            return jsonify({"error": "Invalid profile ID"}), 400

        update_fields = {"updated_at": datetime.utcnow()}
        if 'age' in data:
            update_fields['age'] = data['age']
        if 'gender' in data:
            if data['gender'] not in ['male', 'female', 'other']:
                return jsonify({"error": "Invalid gender"}), 400
            update_fields['gender'] = data['gender']
        if 'skinFairness' in data:
            if data['skinFairness'] not in [1, 2, 3, 4, 5, 6]:
                return jsonify({"error": "Invalid skin fairness value"}), 400
            update_fields['skinFairness'] = data['skinFairness']

        result = profiles_collection.update_one(
            {"_id": ObjectId(profile_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Profile not found"}), 404

        updated_profile = profiles_collection.find_one({"_id": ObjectId(profile_id)})
        return jsonify(updated_profile), 200

    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@app.route('/api/profile/<profile_id>', methods=['GET'])
def get_legacy_profile(profile_id):
    try:
        if not ObjectId.is_valid(profile_id):
            return jsonify({"error": "Invalid profile ID"}), 400

        profile = profiles_collection.find_one({"_id": ObjectId(profile_id)})
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        return jsonify(profile), 200

    except Exception as e:
        print(f"Error fetching profile: {e}")
        return jsonify({"error": "Failed to fetch profile"}), 500

# -------- Main Execution --------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
