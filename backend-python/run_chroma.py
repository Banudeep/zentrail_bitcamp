from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import torch
import logging
from transformers import AutoTokenizer, AutoModel
import uvicorn
from dotenv import load_dotenv
import os
from datetime import datetime
from enum import Enum
from pymongo import MongoClient

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize BERT model and tokenizer
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModel.from_pretrained('bert-base-uncased')

# MongoDB connection
def get_db_connection():
    client = MongoClient(os.getenv("MONGODB_URI"))
    return client[os.getenv("DB_NAME", "zentrail")]

class TimeOfDay(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"

class ParkPreferences(BaseModel):
    start_date: str
    end_date: str
    group_size: int
    time_preferences: List[TimeOfDay]

class TripPlanningQuestion(BaseModel):
    id: str
    question: str
    type: str
    options: Optional[List[Dict[str, str]]] = None

class ChatRequest(BaseModel):
    message: str
    parkCode: str
    selectedActivities: Optional[List[str]] = None

class ChatResponse(BaseModel):
    response: str
    context: Optional[Dict[str, Any]] = None
    suggested_activities: Optional[List[Dict[str, str]]] = None

INITIAL_QUESTIONS = [
    {
        "id": "dates",
        "question": "When are you planning to visit? Please provide start and end dates.",
        "type": "date_range"
    },
    {
        "id": "group_size",
        "question": "How many people will be in your group?",
        "type": "number"
    },
    {
        "id": "time_preferences",
        "question": "What times of day do you prefer for activities?",
        "type": "multiple_choice",
        "options": [
            {"id": "morning", "name": "Morning"},
            {"id": "afternoon", "name": "Afternoon"},
            {"id": "evening", "name": "Evening"},
            {"id": "night", "name": "Night"}
        ]
    }
]

def get_bert_embedding(text: str) -> np.ndarray:
    """Get BERT embeddings for a text string"""
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    # Use mean pooling of last hidden state
    embeddings = outputs.last_hidden_state.mean(dim=1)
    return embeddings.numpy()

def semantic_search(query: str, park_info: Dict[str, Any]) -> Dict[str, Any]:
    """Perform semantic search on park information"""
    query_embedding = get_bert_embedding(query)
    
    # Create embeddings for different aspects of park info
    park_texts = [
        park_info.get('description', ''),
        park_info.get('weatherInfo', ''),
        park_info.get('directionsInfo', ''),
        ' '.join([act.get('name', '') for act in park_info.get('activities', [])])
    ]
    
    park_embeddings = [get_bert_embedding(text) for text in park_texts if text]
    
    # Calculate similarities
    similarities = [
        float(np.dot(query_embedding, park_emb.T) / 
              (np.linalg.norm(query_embedding) * np.linalg.norm(park_emb)))
        for park_emb in park_embeddings
    ]
    
    # Get most relevant information
    max_sim_idx = np.argmax(similarities)
    return {
        'relevant_text': park_texts[max_sim_idx],
        'similarity_score': similarities[max_sim_idx]
    }

def filter_activities_by_query(query: str, activities: List[Dict[str, str]], threshold: float = 0.5) -> List[Dict[str, str]]:
    """Filter activities based on semantic similarity to the query"""
    query_embedding = get_bert_embedding(query)
    
    results = []
    for activity in activities:
        activity_embedding = get_bert_embedding(activity['name'])
        similarity = float(np.dot(query_embedding, activity_embedding.T) / 
                         (np.linalg.norm(query_embedding) * np.linalg.norm(activity_embedding)))
        if similarity > threshold:
            results.append({**activity, 'relevance': similarity})
    
    return sorted(results, key=lambda x: x['relevance'], reverse=True)

@app.get("/park/{park_code}/activities")
async def get_park_activities(park_code: str):
    """Get activities for a specific park from MongoDB"""
    try:
        db = get_db_connection()
        
        # Find the park by parkCode
        park = db.parks.find_one({"parkCode": park_code})
        
        if not park:
            raise HTTPException(status_code=404, detail="Park not found")
        
        # Extract activities from the park document
        activities = park.get('activities', [])
        
        return {
            "activities": activities
        }
    except Exception as e:
        logger.error(f"Error fetching park activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching park activities")

@app.get("/planning/initial-questions")
async def get_initial_questions():
    """Get the initial planning questions"""
    return {"questions": INITIAL_QUESTIONS}

@app.post("/planning/save-preferences/{park_code}")
async def save_preferences(park_code: str, preferences: ParkPreferences):
    """Save user preferences for a park visit"""
    try:
        db = get_db_connection()
        # You might want to store these preferences in a separate collection
        db.trip_preferences.insert_one({
            "parkCode": park_code,
            "preferences": preferences.dict(),
            "created_at": datetime.utcnow()
        })
        return {"status": "success", "message": "Preferences saved successfully"}
    except Exception as e:
        logger.error(f"Error saving preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Error saving preferences")

@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        db = get_db_connection()
        park = db.parks.find_one({"parkCode": request.parkCode})
        
        if not park:
            raise HTTPException(status_code=404, detail="Park not found")
        
        # Get relevant context using BERT
        search_result = semantic_search(request.message, park)
        
        # Filter activities based on the query
        relevant_activities = filter_activities_by_query(
            request.message, 
            park.get('activities', [])
        )
        
        # Create response context
        context = {
            "parkName": park.get("fullName"),
            "activities": request.selectedActivities if request.selectedActivities else [act.get("id") for act in relevant_activities[:5]],
            "relevantInfo": search_result["relevant_text"],
            "similarity": search_result["similarity_score"]
        }
        
        # Generate response based on context
        base_response = f"Here's what I found about {park.get('fullName')}:\n{search_result['relevant_text']}"
        
        if relevant_activities:
            activities_text = "\n\nRelated activities you might enjoy:\n" + "\n".join([
                f"- {activity['name']}" for activity in relevant_activities[:5]
            ])
            response = base_response + activities_text
        else:
            response = base_response
        
        return ChatResponse(
            response=response, 
            context=context,
            suggested_activities=relevant_activities[:5]
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "BERT Similarity Search Server is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "bert-base-uncased",
        "model_loaded": True
    }

if __name__ == "__main__":
    try:
        port = int(os.getenv("PORT", "8000"))
        host = os.getenv("HOST", "0.0.0.0")
        logger.info(f"Starting server on {host}:{port}")
        uvicorn.run("run_chroma:app", host=host, port=port, log_level="info")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise