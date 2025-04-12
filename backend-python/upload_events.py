import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# MongoDB setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
events_collection = db["events"]

# NPS API setup
base_url = "https://developer.nps.gov/api/v1/events"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_events():
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
            print(f"❌ Error {response.status_code}")
            break

        data = response.json()
        events = data.get("data", [])
        total = int(data.get("total", 0))

        for event in events:
            events_collection.update_one(
                {"id": event["id"]},
                {"$set": event},
                upsert=True
            )

        print(f"✅ Inserted {start + len(events)} / {total} events")
        start += limit

    print("🎉 All events successfully inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_events()
