import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import google.generativeai as genai
from dotenv import load_dotenv
import numpy as np
from typing import List, Dict, Optional

load_dotenv()

app = FastAPI(
    title="National Parks Chatbot API",
    description="An AI-powered chatbot for querying information about national parks using RAG and Gemini",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB connection with MongoDB Atlas URI - direct connection
MONGO_URI = "mongodb+srv://aravindpanchanathan:selvi123@cluster1.u5xx2.mongodb.net/"
client = MongoClient(MONGO_URI)
db = client['zentrail']
parks_collection = db.parks

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize Gemini with safety settings
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
generation_config = {
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model_gemini = genai.GenerativeModel(
    model_name="gemini-2.0-flash",  # Updated to use the correct model name
    generation_config=generation_config,
    safety_settings=safety_settings
)

class ChatRequest(BaseModel):
    query: str
    parkCode: Optional[str] = None

class Park(BaseModel):
    name: str
    description: str
    activities: List[Dict]

class ChatResponse(BaseModel):
    response: str
    relevant_parks: List[Park]

def preprocess_park_data(park: Dict) -> str:
    """Convert park document to searchable text"""
    activities_text = ', '.join([activity['name'] for activity in park.get('activities', [])])
    return f"""Park Name: {park.get('name', '')}
Description: {park.get('description', '')}
Location: {park.get('states', '')}
Activities: {activities_text}
Topics: {', '.join([topic['name'] for topic in park.get('topics', [])])}\n"""

class ParkChatbot:
    def __init__(self):
        self.park_data, self.park_embeddings = self._create_park_embeddings()
    
    def _create_park_embeddings(self):
        """Create embeddings for all parks"""
        parks = parks_collection.find({})
        park_embeddings = []
        park_data = []
        
        for park in parks:
            text = preprocess_park_data(park)
            embedding = model.encode(text)
            park_embeddings.append(embedding)
            park_data.append(park)
        
        return park_data, park_embeddings

    def _find_similar_parks(self, query: str, top_k: int = 3, park_code: Optional[str] = None):
        """Find parks similar to the query"""
        query_embedding = model.encode(query)
        
        if park_code:
            # If park_code is provided, only return that specific park
            park = parks_collection.find_one({"parkCode": park_code})
            return [park] if park else []
        else:
            # Calculate cosine similarity for all parks
            similarities = [np.dot(query_embedding, park_emb) / 
                        (np.linalg.norm(query_embedding) * np.linalg.norm(park_emb))
                        for park_emb in self.park_embeddings]
            
            # Get top-k similar parks
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            return [self.park_data[i] for i in top_indices]

    def _generate_response(self, query: str, similar_parks: List[Dict], park_code: Optional[str] = None) -> str:
        """Generate response using Gemini"""
        if not similar_parks:
            return "I couldn't find information about that park. Please try another query."

        context = "\n\n".join([preprocess_park_data(park) for park in similar_parks])
        
        if park_code and similar_parks:
            activities_text = "\n".join([
                f"- {activity['name']}" 
                for activity in similar_parks[0].get('activities', [])
            ])
            
            prompt = f"""You are a friendly park ranger chatbot having a conversation about {similar_parks[0]['name']}. 
Keep your responses short, natural and conversational - like how a park ranger would talk to a visitor.
Break up your response into 2-3 short sentences at most.
Use casual, friendly language but be informative.

Here's the park information:
{context}

Available activities:
{activities_text}

User's question: {query}

Respond naturally focusing on answering their specific question about {similar_parks[0]['name']}."""
        else:
            prompt = f"""You are a friendly park ranger chatbot having a casual conversation. 
Keep your responses short, natural and conversational - like how a park ranger would talk to a visitor.
Break up your response into 2-3 short sentences at most.
Use casual, friendly language but be informative.

Here's information about some relevant parks:
{context}

User's question: {query}

Respond naturally focusing on answering their specific question."""

        try:
            response = model_gemini.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating response: {str(e)}")
            return "I apologize, but I'm having trouble generating a response at the moment. Please try again."

    def get_response(self, query: str, park_code: Optional[str] = None) -> Dict:
        """Get response for a query, optionally focusing on a specific park"""
        try:
            similar_parks = self._find_similar_parks(query, park_code=park_code)
            response = self._generate_response(query, similar_parks, park_code)
            
            return {
                'response': response,
                'relevant_parks': [
                    {
                        'name': park['name'],
                        'description': park['description'],
                        'activities': park.get('activities', [])
                    }
                    for park in similar_parks
                ]
            }
        except Exception as e:
            print(f"Error in get_response: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# Initialize chatbot
chatbot = ParkChatbot()

@app.get("/")
async def root():
    """Root endpoint that provides API information"""
    return {
        "message": "Welcome to the National Parks Chatbot API",
        "version": "1.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Get a response from the chatbot about national parks.
    """
    try:
        return chatbot.get_response(request.query, request.parkCode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)