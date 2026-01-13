import os
import requests
import pymongo
import json
from dotenv import load_dotenv
from time import sleep

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

if not MONGO_URI:
    print("❌ Error: MONGO_URI or MONGODB_URI not found in environment variables")
    print("   Please set one of these in your .env file:")
    print("   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/")
    print("   or")
    print("   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/")
    exit(1)

# MongoDB setup
try:
    client = pymongo.MongoClient(MONGO_URI)
    # Test the connection
    client.admin.command('ping')
    print(f"✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    print(f"   Connection string: {MONGO_URI.replace('://', '://****:****@') if '@' in MONGO_URI else MONGO_URI}")
    exit(1)

db = client["zentrail"]
trails_collection = db["trails"]
parks_collection = db["parks"]

def upload_trail_data(trail_data):
    """
    Upload a single trail document to MongoDB
    """
    try:
        # Validate required fields
        properties = trail_data.get("properties", {})
        geometry = trail_data.get("geometry")
        
        # Check if trail has required data
        if not properties:
            return False, "Missing properties"
        
        if not geometry or not geometry.get("coordinates"):
            return False, "Missing geometry coordinates"
        
        # Use UNITCODE and TRLNAME as a composite key to avoid duplicates
        # If TRLNAME is missing, try to use other identifiers
        unit_code = properties.get("UNITCODE")
        trail_name = properties.get("TRLNAME") or properties.get("NAME") or "Unknown"
        
        if not unit_code:
            return False, "Missing UNITCODE"
        
        filter_criteria = {
            "properties.UNITCODE": unit_code,
            "properties.TRLNAME": trail_name
        }
        
        # Upsert the trail data
        result = trails_collection.update_one(
            filter_criteria,
            {"$set": trail_data},
            upsert=True
        )
        
        if result.upserted_id:
            return True, "inserted"
        else:
            return True, "updated"
        
    except Exception as e:
        trail_name = trail_data.get('properties', {}).get('TRLNAME', 'Unknown')
        return False, f"Error: {str(e)}"

def upload_multiple_trails(trails_data, verbose=False):
    """
    Upload multiple trail documents to MongoDB
    """
    if not trails_data:
        print("⚠️  No trail data provided")
        return
    
    success_count = 0
    failed_count = 0
    inserted_count = 0
    updated_count = 0
    total_count = len(trails_data)
    failed_trails = []
    
    print(f"📤 Starting upload of {total_count} trails...")
    
    for i, trail in enumerate(trails_data, 1):
        success, message = upload_trail_data(trail)
        
        if success:
            success_count += 1
            if message == "inserted":
                inserted_count += 1
            elif message == "updated":
                updated_count += 1
            
            if verbose:
                trail_name = trail.get('properties', {}).get('TRLNAME', 'Unknown')
                if message == "inserted":
                    print(f"✅ Inserted new trail: {trail_name}")
                else:
                    print(f"✅ Updated existing trail: {trail_name}")
        else:
            failed_count += 1
            trail_name = trail.get('properties', {}).get('TRLNAME', 'Unknown')
            unit_code = trail.get('properties', {}).get('UNITCODE', 'Unknown')
            failed_trails.append({
                "name": trail_name,
                "unit": unit_code,
                "reason": message
            })
            if verbose:
                print(f"❌ Failed: {trail_name} ({unit_code}) - {message}")
        
        # Progress indicator every 100 trails
        if i % 100 == 0:
            print(f"   Progress: {i}/{total_count} trails processed... (✅ {success_count} success, ❌ {failed_count} failed)")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Upload Summary:")
    print(f"   Total processed: {total_count}")
    print(f"   ✅ Successfully uploaded: {success_count} ({success_count/total_count*100:.1f}%)")
    print(f"      - New trails inserted: {inserted_count}")
    print(f"      - Existing trails updated: {updated_count}")
    print(f"   ❌ Failed: {failed_count} ({failed_count/total_count*100:.1f}%)")
    
    # Show common failure reasons
    if failed_trails:
        failure_reasons = {}
        for trail in failed_trails:
            reason = trail["reason"]
            failure_reasons[reason] = failure_reasons.get(reason, 0) + 1
        
        print(f"\n   Common failure reasons:")
        for reason, count in sorted(failure_reasons.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"      - {reason}: {count} trails")
        
        # Optionally save failed trails to a file for review
        if failed_count > 0 and failed_count < 100:  # Only if not too many
            print(f"\n   💡 Tip: Review failed trails above for details")
    
    print(f"{'='*60}\n")

def load_trails_from_file(file_path):
    """
    Load trail data from a JSON or GeoJSON file
    """
    import json
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle GeoJSON FeatureCollection
        if isinstance(data, dict):
            if data.get("type") == "FeatureCollection":
                return data.get("features", [])
            elif data.get("type") == "Feature":
                return [data]
            # If it's a dict with a list of features
            elif "features" in data:
                return data["features"]
            # If it's a dict with a list of trails
            elif "trails" in data:
                return data["trails"]
        
        # Handle array of features
        if isinstance(data, list):
            return data
        
        print(f"⚠️  Unknown file format in {file_path}")
        return []
        
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in file {file_path}: {e}")
        return []
    except Exception as e:
        print(f"❌ Error reading file {file_path}: {e}")
        return []

def fetch_trails_from_nps_api(park_code):
    """
    Fetch trail data from NPS API for a specific park
    """
    if not NPS_API_KEY:
        print("❌ NPS_API_KEY not found in environment variables")
        return None
    
    # Try the mapdata endpoint first (similar to park boundaries)
    url = f"https://developer.nps.gov/api/v1/mapdata/trails/{park_code}"
    headers = {
        "X-Api-Key": NPS_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            # Trail endpoint might not exist, try ArcGIS Feature Service
            return None
        else:
            print(f"⚠️  API returned status {response.status_code} for {park_code}")
            return None
    except Exception as e:
        print(f"⚠️  Error fetching from NPS API for {park_code}: {e}")
        return None

def fetch_trails_from_arcgis(park_code=None, limit=1000):
    """
    Fetch trail data from NPS ArcGIS Feature Service
    """
    base_url = "https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails/FeatureServer/0/query"
    
    # Build query parameters
    params = {
        "where": "1=1",  # Get all trails
        "outFields": "*",
        "f": "geojson",
        "returnGeometry": "true",
        "resultRecordCount": limit
    }
    
    # If park code provided, filter by UNITCODE
    if park_code:
        params["where"] = f"UNITCODE = '{park_code}'"
    
    try:
        response = requests.get(base_url, params=params, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("type") == "FeatureCollection":
                return data.get("features", [])
            return data
        else:
            print(f"⚠️  ArcGIS returned status {response.status_code}")
            return None
    except Exception as e:
        print(f"⚠️  Error fetching from ArcGIS: {e}")
        return None

def convert_arcgis_trail_to_standard(trail_feature):
    """
    Convert ArcGIS trail feature to standard format
    """
    if not trail_feature or trail_feature.get("type") != "Feature":
        return None
    
    properties = trail_feature.get("properties", {})
    geometry = trail_feature.get("geometry")
    
    # Map ArcGIS fields to our standard format
    standard_trail = {
        "type": "Feature",
        "properties": {
            "OBJECTID": properties.get("OBJECTID"),
            "TRLNAME": properties.get("TRLNAME") or properties.get("NAME"),
            "TRLALTNAME": properties.get("TRLALTNAME") or properties.get("ALTNAME"),
            "MAPLABEL": properties.get("MAPLABEL") or properties.get("LABEL"),
            "TRLSTATUS": properties.get("TRLSTATUS") or properties.get("STATUS"),
            "TRLSURFACE": properties.get("TRLSURFACE") or properties.get("SURFACE"),
            "TRLTYPE": properties.get("TRLTYPE") or properties.get("TYPE"),
            "TRLCLASS": properties.get("TRLCLASS") or properties.get("CLASS"),
            "TRLUSE": properties.get("TRLUSE") or properties.get("USE"),
            "UNITCODE": properties.get("UNITCODE") or properties.get("PARK_CODE"),
            "UNITNAME": properties.get("UNITNAME") or properties.get("PARK_NAME"),
            "SEASONAL": properties.get("SEASONAL"),
            "SEASDESC": properties.get("SEASDESC") or properties.get("SEASONAL_DESC"),
            "MAINTAINER": properties.get("MAINTAINER"),
            "NOTES": properties.get("NOTES") or properties.get("DESCRIPTION"),
        },
        "geometry": geometry
    }
    
    # Remove None values from properties
    standard_trail["properties"] = {k: v for k, v in standard_trail["properties"].items() if v is not None}
    
    return standard_trail

def fetch_and_store_all_trails():
    """
    Fetch trails from NPS for all parks and store in MongoDB
    """
    if not NPS_API_KEY:
        print("❌ NPS_API_KEY not found. Please set it in your .env file")
        return
    
    print("📡 Fetching trails from NPS ArcGIS Feature Service...")
    
    # Try to fetch all trails from ArcGIS (more reliable than per-park)
    all_trails = fetch_trails_from_arcgis(limit=10000)
    
    if all_trails and len(all_trails) > 0:
        print(f"✅ Fetched {len(all_trails)} trails from ArcGIS")
        
        # Convert and upload
        converted_trails = []
        for trail in all_trails:
            converted = convert_arcgis_trail_to_standard(trail)
            if converted:
                converted_trails.append(converted)
        
        print(f"📤 Uploading {len(converted_trails)} converted trails...")
        upload_multiple_trails(converted_trails)
        return
    
    # Fallback: Try per-park from NPS API
    print("⚠️  ArcGIS fetch failed, trying per-park from NPS API...")
    park_codes = parks_collection.distinct("parkCode")
    print(f"📍 Found {len(park_codes)} parks to fetch trails for")
    
    total_trails = 0
    for i, park_code in enumerate(park_codes, 1):
        print(f"\n[{i}/{len(park_codes)}] Fetching trails for {park_code}...")
        
        # Try NPS API first
        trail_data = fetch_trails_from_nps_api(park_code)
        
        if trail_data:
            # Process and upload
            if isinstance(trail_data, dict) and trail_data.get("type") == "FeatureCollection":
                trails = trail_data.get("features", [])
            elif isinstance(trail_data, list):
                trails = trail_data
            else:
                trails = [trail_data]
            
            if trails:
                upload_multiple_trails(trails)
                total_trails += len(trails)
        else:
            # Try ArcGIS for this specific park
            park_trails = fetch_trails_from_arcgis(park_code=park_code)
            if park_trails:
                converted = [convert_arcgis_trail_to_standard(t) for t in park_trails]
                converted = [t for t in converted if t]  # Remove None values
                if converted:
                    upload_multiple_trails(converted)
                    total_trails += len(converted)
        
        # Rate limiting
        sleep(0.5)
    
    print(f"\n🎉 Completed! Total trails processed: {total_trails}")

if __name__ == "__main__":
    import sys
    
    # Check if file path provided as command line argument
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(f"📂 Loading trails from file: {file_path}")
        trails_data = load_trails_from_file(file_path)
        
        if trails_data:
            upload_multiple_trails(trails_data)
        else:
            print("❌ No trail data loaded from file")
            sys.exit(1)
    else:
        # Default: Fetch from NPS API
        print("📡 Fetching trails from NPS...")
        fetch_and_store_all_trails()
        
        print("\n💡 Alternative usage:")
        print("   python upload_trails.py                    # Fetch from NPS API")
        print("   python upload_trails.py trails.json        # Load from file")