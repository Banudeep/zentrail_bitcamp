import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# Setup MongoDB client
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
activities_collection = db["activities"]

# API endpoint
url = "https://developer.nps.gov/api/v1/activities/parks"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_activities():
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        return

    data = response.json()
    activities = data.get("data", [])

    # Insert each activity with upsert (avoid duplicates)
    for activity in activities:
        activities_collection.update_one(
            {"id": activity["id"]}, 
            {"$set": activity},
            upsert=True
        )

    print(f"🎉 {len(activities)} activities successfully inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_activities()
