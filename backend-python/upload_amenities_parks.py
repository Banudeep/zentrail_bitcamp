import os
import requests
import pymongo
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup MongoDB
MONGO_URI = os.getenv("MONGO_URI")
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
collection = db["amenities_parksplaces"]

# Setup API
API_KEY = os.getenv("NPS_API_KEY")
url = "https://developer.nps.gov/api/v1/amenities/parksplaces"
headers = {"X-Api-Key": API_KEY}

def fetch_and_store():
    start = 0
    limit = 50
    total = 1  # just to start the loop

    while start < total:
        params = {
            "start": start,
            "limit": limit,
            "api_key": API_KEY
        }

        response = requests.get(url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return

        data = response.json()
        total = int(data.get("total", 0))

        for amenities_list in data.get("data", []):
            for amenity in amenities_list:
                collection.update_one(
                    {"id": amenity["id"]},  # upsert by unique amenity ID
                    {"$set": amenity},
                    upsert=True
                )

        print(f"✅ Inserted {min(start + limit, total)} / {total} records")
        start += limit

    print("🎉 All amenities/parksplaces data loaded successfully!")

if __name__ == "__main__":
    fetch_and_store()

