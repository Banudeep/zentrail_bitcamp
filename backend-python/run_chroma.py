from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import torch
import logging
from transformers import AutoTokenizer, AutoModel
import uvicorn
from dotenv import load_dotenv
import os

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

# Sample data - replace with your actual park data
PARK_DATA = [
    {
        "text": "Yosemite Valley is home to some of the world's most famous waterfalls, including Yosemite Falls.",
        "metadata": {"park_code": "yose", "type": "attractions", "location": "Yosemite Valley"}
    },
    {
        "text": "Half Dome is Yosemite's most distinctive natural feature, rising more than 4,737 feet above the valley floor.",
        "metadata": {"park_code": "yose", "type": "landmark", "location": "Half Dome"}
    },
    {
        "text": "The Mist Trail leads hikers to both Vernal Fall and Nevada Fall, offering spectacular views.",
        "metadata": {"park_code": "yose", "type": "trail", "location": "Mist Trail"}
    }
]

# Initialize the transformer model and tokenizer
try:
    model_name = 'bert-base-uncased'
    logger.info(f"Loading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()  # Set model to evaluation mode
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_embedding(text):
    # Tokenize text
    encoded_input = tokenizer(text, padding=True, truncation=True, return_tensors='pt', max_length=512)
    
    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    # Perform pooling
    embedding = mean_pooling(model_output, encoded_input['attention_mask'])
    
    # Normalize embedding
    embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
    
    return embedding.numpy()[0]

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

class QueryRequest(BaseModel):
    query: str
    park_code: str
    n_results: Optional[int] = 3

@app.get("/")
async def root():
    return {"message": "BERT Similarity Search Server is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "bert-base-uncased",
        "model_loaded": model is not None
    }

@app.post("/query")
async def query_collection(request: QueryRequest):
    try:
        # Get query embedding
        query_embedding = get_embedding(request.query)
        
        # Calculate similarities with all texts
        similarities = []
        for item in PARK_DATA:
            if request.park_code and item['metadata']['park_code'] != request.park_code:
                continue
            doc_embedding = get_embedding(item['text'])
            similarity = cosine_similarity(query_embedding, doc_embedding)
            similarities.append((similarity, item))
        
        # Sort by similarity and get top k results
        similarities.sort(key=lambda x: x[0], reverse=True)
        top_k = similarities[:request.n_results]
        
        results = {
            "documents": [[item[1]['text'] for item in top_k]],
            "metadatas": [[item[1]['metadata'] for item in top_k]],
            "scores": [[float(item[0]) for item in top_k]]
        }
        
        return {
            "results": results,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error during query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    try:
        port = int(os.getenv("PORT", "8000"))
        host = os.getenv("HOST", "0.0.0.0")
        logger.info(f"Starting server on {host}:{port}")
        uvicorn.run("run_chroma:app", host=host, port=port, log_level="info")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise