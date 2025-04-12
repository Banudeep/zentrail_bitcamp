import requests
import pymongo
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
NPS_API_KEY = os.getenv("NPS_API_KEY")

# MongoDB setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
alerts_collection = db["alerts"]

# NPS API endpoint for alerts
base_url = "https://developer.nps.gov/api/v1/alerts"
headers = {"X-Api-Key": NPS_API_KEY}

def fetch_and_store_alerts():
    limit = 50
    start = 0
    total = 1  # Placeholder

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
        alerts = data.get("data", [])
        total = int(data.get("total", 0))

        for alert in alerts:
            alerts_collection.update_one(
                {"id": alert["id"]},
                {"$set": alert},
                upsert=True
            )

        print(f"✅ Inserted {start + len(alerts)} / {total} alerts")
        start += limit

    print("🎉 All alerts successfully inserted into MongoDB!")

if __name__ == "__main__":
    fetch_and_store_alerts()
