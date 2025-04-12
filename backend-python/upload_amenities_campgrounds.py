import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# MongoDB Setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
campgrounds_collection = db["campgrounds"]

# NPS API endpoint
base_url = "https://developer.nps.gov/api/v1/campgrounds"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_data():
    limit = 50
    start = 0
    total = 1  # dummy value to enter the loop

    while start < total:
        params = {
            "limit": limit,
            "start": start
        }

        response = requests.get(base_url, headers=headers, params=params)
        if response.status_code != 200:
            print(f"❌ Error {response.status_code}")
            break

        json_data = response.json()
        total = int(json_data.get("total", 0))

        # Some data responses are double nested (list inside list)
        # Flatten it here:
        raw_data = json_data.get("data", [])
        if raw_data and isinstance(raw_data[0], list):
            campgrounds = raw_data[0]
        else:
            campgrounds = raw_data

        for campground in campgrounds:
            campgrounds_collection.update_one(
                {"id": campground["id"]},
                {"$set": campground},
                upsert=True
            )

        print(f"✅ Inserted {start + len(campgrounds)} / {total} campgrounds")
        start += limit

    print("🎉 All campgrounds successfully inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_data()
