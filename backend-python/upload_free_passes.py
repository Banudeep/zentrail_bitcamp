import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB & API credentials
MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# Connect to MongoDB
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
feespasses_collection = db["feespasses"]

# NPS API Endpoint
base_url = "https://developer.nps.gov/api/v1/feespasses"
headers = {
    "X-Api-Key": NPS_API_KEY
}

def fetch_and_store_feespasses():
    limit = 50
    start = 0
    total = 1  # placeholder to start loop

    while start < total:
        params = {
            "limit": limit,
            "start": start
        }

        response = requests.get(base_url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            return

        data = response.json()
        feespasses_data = data.get("data", [])
        total = int(data.get("total", 0))

        for record in feespasses_data:
            # Use parkCode to prevent duplication
            park_code = record.get("parkCode")
            feespasses_collection.update_one(
                {"parkCode": park_code},
                {"$set": record},
                upsert=True
            )

        print(f"✅ Inserted {start + len(feespasses_data)} / {total} records")
        start += limit

    print("🎉 All fee/pass data successfully stored in MongoDB!")

if __name__ == "__main__":
    fetch_and_store_feespasses()
