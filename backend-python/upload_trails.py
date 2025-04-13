import os
import pymongo
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

# MongoDB setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
trails_collection = db["trails"]

def upload_trail_data(trail_data):
    """
    Upload a single trail document to MongoDB
    """
    try:
        # Use UNITCODE and TRLNAME as a composite key to avoid duplicates
        filter_criteria = {
            "properties.UNITCODE": trail_data["properties"]["UNITCODE"],
            "properties.TRLNAME": trail_data["properties"]["TRLNAME"]
        }
        
        # Upsert the trail data
        result = trails_collection.update_one(
            filter_criteria,
            {"$set": trail_data},
            upsert=True
        )
        
        if result.upserted_id:
            print(f"✅ Inserted new trail: {trail_data['properties']['TRLNAME']}")
        else:
            print(f"✅ Updated existing trail: {trail_data['properties']['TRLNAME']}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error uploading trail {trail_data.get('properties', {}).get('TRLNAME')}: {str(e)}")
        return False

def upload_multiple_trails(trails_data):
    """
    Upload multiple trail documents to MongoDB
    """
    success_count = 0
    total_count = len(trails_data)
    
    for trail in trails_data:
        if upload_trail_data(trail):
            success_count += 1
    
    print(f"🎉 Successfully uploaded {success_count} out of {total_count} trails")

if __name__ == "__main__":
    # Example usage
    trail_data = {
        "type": "Feature",
        "properties": {
            "OBJECTID": 1,
            "TRLNAME": "Chilkoot Trail",
            "TRLALTNAME": "Finnegan's Point to Canyon City",
            "MAPLABEL": "Chilkoot Trail",
            "TRLSTATUS": "Existing",
            "TRLSURFACE": "Native",
            "TRLTYPE": "Standard Terra Trail",
            "TRLCLASS": "Class 3: Developed",
            "TRLUSE": "Hiker/Pedestrian",
            "UNITCODE": "KLGO",
            "UNITNAME": "Klondike Gold Rush National Historical Park",
            "SEASONAL": "Yes",
            "SEASDESC": "Winter seasonal closure",
            "MAINTAINER": "National Park Service",
            "NOTES": "Main Trail. Data: 2001-2004."
        },
        "geometry": {
            "type": "LineString",
            "coordinates": []  # Add your trail coordinates here
        }
    }
    
    # Upload single trail example
    upload_trail_data(trail_data)