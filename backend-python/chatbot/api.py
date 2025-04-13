from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
from main import chatbot

# Create FastAPI instance with OpenAPI documentation configuration
app = FastAPI(
    title="National Parks Chatbot API",
    description="An AI-powered chatbot for querying information about national parks using RAG and Gemini",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class Activity(BaseModel):
    id: str
    name: str

class Park(BaseModel):
    name: str
    description: str
    activities: List[Activity]

class ChatRequest(BaseModel):
    query: str
    parkCode: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Show me parks with hiking trails",
                "parkCode": "yose"
            }
        }

class ChatResponse(BaseModel):
    response: str
    relevant_parks: List[Park]

    class Config:
        json_schema_extra = {
            "example": {
                "response": "Here are some parks with excellent hiking trails...",
                "relevant_parks": [
                    {
                        "name": "Yosemite National Park",
                        "description": "Home to granite cliffs, waterfalls, and diverse wildlife...",
                        "activities": [
                            {"id": "1", "name": "Hiking"},
                            {"id": "2", "name": "Rock Climbing"}
                        ]
                    }
                ]
            }
        }

@app.get("/")
async def root():
    """Root endpoint that provides API information"""
    return {
        "message": "Welcome to the National Parks Chatbot API",
        "docs": "Visit /docs for the Swagger documentation",
        "redoc": "Visit /redoc for ReDoc documentation"
    }

@app.post("/chat", 
    response_model=ChatResponse,
    summary="Get chatbot response",
    description="Send a query about national parks and receive relevant information and park suggestions",
    response_description="A detailed response about relevant national parks based on the query"
)
async def chat_endpoint(request: ChatRequest):
    """
    Get a response from the chatbot about national parks.
    
    Parameters:
    - **query**: Your question or request about national parks
    - **parkCode**: Optional park code to get specific park information
    
    Returns:
    - **response**: Detailed answer from the chatbot
    - **relevant_parks**: List of relevant national parks with their details
    """
    try:
        if request.parkCode:
            response = chatbot.get_response(request.query, park_code=request.parkCode)
        else:
            response = chatbot.get_response(request.query)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=str(e)
        )

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8080, reload=True)