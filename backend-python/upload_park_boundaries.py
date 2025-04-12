import requests
import pymongo
import os
from dotenv import load_dotenv
from time import sleep

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# MongoDB setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
parks_collection = db["parks"]
boundaries_collection = db["park_boundaries"]

# Base URL setup
base_url = "https://developer.nps.gov/api/v1/mapdata/parkboundaries"
headers = {
    "X-Api-Key": NPS_API_KEY
}

def fetch_and_store_park_boundaries():
    # Get all unique parkCodes
    park_codes = parks_collection.distinct("parkCode")
    print(f"📍 Found {len(park_codes)} unique park codes.")

    for code in park_codes:
        url = f"{base_url}/{code}"
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()

            boundaries_collection.update_one(
                {"parkCode": code},
                {"$set": {"parkCode": code, "boundaryData": data}},
                upsert=True
            )
            print(f"✅ Stored boundary data for: {code}")
        else:
            print(f"❌ Failed to get data for {code} | Status: {response.status_code}")
        
        # Avoid overwhelming API (you can increase the delay if rate-limited)
        sleep(0.5)

    print("🎉 Completed fetching and storing all park boundaries.")

if __name__ == "__main__":
    fetch_and_store_park_boundaries()
