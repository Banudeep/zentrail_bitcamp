import requests
import pymongo
import os
from dotenv import load_dotenv
from time import sleep

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

# MongoDB setup
client = pymongo.MongoClient(MONGO_URI)
db = client["zentrail"]
state_boundaries_collection = db["us_state_boundaries"]

# US State data with abbreviations
US_STATES = [
    {"name": "Alabama", "abbreviation": "AL"},
    {"name": "Alaska", "abbreviation": "AK"},
    {"name": "Arizona", "abbreviation": "AZ"},
    {"name": "Arkansas", "abbreviation": "AR"},
    {"name": "California", "abbreviation": "CA"},
    {"name": "Colorado", "abbreviation": "CO"},
    {"name": "Connecticut", "abbreviation": "CT"},
    {"name": "Delaware", "abbreviation": "DE"},
    {"name": "Florida", "abbreviation": "FL"},
    {"name": "Georgia", "abbreviation": "GA"},
    {"name": "Hawaii", "abbreviation": "HI"},
    {"name": "Idaho", "abbreviation": "ID"},
    {"name": "Illinois", "abbreviation": "IL"},
    {"name": "Indiana", "abbreviation": "IN"},
    {"name": "Iowa", "abbreviation": "IA"},
    {"name": "Kansas", "abbreviation": "KS"},
    {"name": "Kentucky", "abbreviation": "KY"},
    {"name": "Louisiana", "abbreviation": "LA"},
    {"name": "Maine", "abbreviation": "ME"},
    {"name": "Maryland", "abbreviation": "MD"},
    {"name": "Massachusetts", "abbreviation": "MA"},
    {"name": "Michigan", "abbreviation": "MI"},
    {"name": "Minnesota", "abbreviation": "MN"},
    {"name": "Mississippi", "abbreviation": "MS"},
    {"name": "Missouri", "abbreviation": "MO"},
    {"name": "Montana", "abbreviation": "MT"},
    {"name": "Nebraska", "abbreviation": "NE"},
    {"name": "Nevada", "abbreviation": "NV"},
    {"name": "New Hampshire", "abbreviation": "NH"},
    {"name": "New Jersey", "abbreviation": "NJ"},
    {"name": "New Mexico", "abbreviation": "NM"},
    {"name": "New York", "abbreviation": "NY"},
    {"name": "North Carolina", "abbreviation": "NC"},
    {"name": "North Dakota", "abbreviation": "ND"},
    {"name": "Ohio", "abbreviation": "OH"},
    {"name": "Oklahoma", "abbreviation": "OK"},
    {"name": "Oregon", "abbreviation": "OR"},
    {"name": "Pennsylvania", "abbreviation": "PA"},
    {"name": "Rhode Island", "abbreviation": "RI"},
    {"name": "South Carolina", "abbreviation": "SC"},
    {"name": "South Dakota", "abbreviation": "SD"},
    {"name": "Tennessee", "abbreviation": "TN"},
    {"name": "Texas", "abbreviation": "TX"},
    {"name": "Utah", "abbreviation": "UT"},
    {"name": "Vermont", "abbreviation": "VT"},
    {"name": "Virginia", "abbreviation": "VA"},
    {"name": "Washington", "abbreviation": "WA"},
    {"name": "West Virginia", "abbreviation": "WV"},
    {"name": "Wisconsin", "abbreviation": "WI"},
    {"name": "Wyoming", "abbreviation": "WY"},
    {"name": "District of Columbia", "abbreviation": "DC"},
]

def fetch_all_states_from_api():
    """
    Fetch all state boundaries GeoJSON from a public API.
    Returns a dictionary mapping abbreviation to state data.
    """
    states_data = {}
    
    try:
        # Try multiple reliable data sources
        sources = [
            "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
            "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states-albers-10m.json",
        ]
        
        for source in sources:
            try:
                print(f"📡 Trying data source: {source}")
                response = requests.get(source, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Handle FeatureCollection
                    if data.get("type") == "FeatureCollection":
                        for feature in data.get("features", []):
                            props = feature.get("properties", {})
                            geometry = feature.get("geometry")
                            
                            if not geometry:
                                continue
                            
                            # Extract state name and abbreviation from various possible fields
                            state_name = (
                                props.get("name") or
                                props.get("NAME") or
                                props.get("state") or
                                props.get("STATE_NAME") or
                                props.get("NAME_1") or
                                ""
                            )
                            
                            abbreviation = (
                                props.get("abbreviation") or
                                props.get("abbr") or
                                props.get("STATE_ABBR") or
                                props.get("STUSPS") or
                                props.get("STUSAB") or
                                ""
                            )
                            
                            # If we have both name and abbreviation, store it
                            if state_name and abbreviation:
                                states_data[abbreviation.upper()] = {
                                    "name": state_name,
                                    "abbreviation": abbreviation.upper(),
                                    "geometry": geometry
                                }
                            elif state_name:
                                # Try to match by name
                                for state in US_STATES:
                                    if state["name"].upper() == state_name.upper():
                                        states_data[state["abbreviation"]] = {
                                            "name": state["name"],
                                            "abbreviation": state["abbreviation"],
                                            "geometry": geometry
                                        }
                                        break
                        
                        if states_data:
                            print(f"✅ Successfully fetched {len(states_data)} states from API")
                            return states_data
                            
            except Exception as e:
                print(f"⚠️  Source {source} failed: {e}")
                continue
                
    except Exception as e:
        print(f"❌ Error fetching from API: {e}")
    
    return states_data

def upload_state_boundaries():
    """
    Upload state boundaries to MongoDB.
    Fetches all states from API first, then uploads them.
    """
    print(f"📍 Starting to upload {len(US_STATES)} state boundaries...")
    
    # First, try to fetch all states from API
    print("\n📡 Fetching state boundaries from public API...")
    api_states = fetch_all_states_from_api()
    
    success_count = 0
    failed_count = 0
    
    for state in US_STATES:
        state_name = state["name"]
        abbreviation = state["abbreviation"]
        
        try:
            # Check if we got this state from the API
            if abbreviation in api_states:
                boundary_data = api_states[abbreviation]
                
                # Update or insert the state boundary
                state_boundaries_collection.update_one(
                    {"abbreviation": abbreviation},
                    {"$set": boundary_data},
                    upsert=True
                )
                print(f"✅ Stored boundary data for: {state_name} ({abbreviation})")
                success_count += 1
            else:
                # Create a placeholder entry (you can update this later with actual GeoJSON)
                placeholder = {
                    "name": state_name,
                    "abbreviation": abbreviation,
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": []
                    }
                }
                state_boundaries_collection.update_one(
                    {"abbreviation": abbreviation},
                    {"$set": placeholder},
                    upsert=True
                )
                print(f"⚠️  Created placeholder for: {state_name} ({abbreviation}) - needs GeoJSON data")
                failed_count += 1
            
            sleep(0.1)  # Small delay between operations
            
        except Exception as e:
            print(f"❌ Error processing {state_name}: {e}")
            failed_count += 1
    
    print(f"\n🎉 Completed!")
    print(f"✅ Successfully uploaded: {success_count}")
    print(f"⚠️  Placeholders created: {failed_count}")
    
    if failed_count > 0:
        print(f"\n💡 Note: For states with placeholders, you can:")
        print(f"   1. Download GeoJSON from: https://github.com/PublicaMundi/MappingAPI")
        print(f"   2. Or use US Census Bureau Cartographic Boundary Files")
        print(f"   3. Manually update the geometry field in MongoDB")

if __name__ == "__main__":
    upload_state_boundaries()

