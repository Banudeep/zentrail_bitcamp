import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# MongoDB Setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
parks_collection = db["parks"]

# API Setup
base_url = "https://developer.nps.gov/api/v1/parks"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_all_parks():
    limit = 50
    start = 0
    total = 1  # Start loop

    while start < total:
        params = {
            "limit": limit,
            "start": start
        }

        response = requests.get(base_url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)  # Debug the error response
            break

        data = response.json()
        parks = data.get("data", [])
        total = int(data.get("total", 0))

        for park in parks:
            parks_collection.update_one(
                {"id": park["id"]},
                {"$set": park},
                upsert=True
            )

        print(f"✅ Inserted {start + len(parks)} / {total} parks")
        start += limit

    print("🎉 All parks successfully inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_all_parks()
