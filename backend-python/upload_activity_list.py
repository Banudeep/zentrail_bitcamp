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
activity_list_collection = db["activity_list"]

# API endpoint
url = "https://developer.nps.gov/api/v1/activities"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_activity_list():
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        return

    data = response.json()
    activities = data.get("data", [])

    for activity in activities:
        activity_list_collection.update_one(
            {"id": activity["id"]},
            {"$set": activity},
            upsert=True
        )

    print(f"🎉 {len(activities)} activity types inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_activity_list()
