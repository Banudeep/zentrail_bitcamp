"""
Basic configuration for the standalone Python chatbot that uses the
official OpenAI API (no Azure-specific logic).
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    """Runtime settings for the chatbot."""

    # API / model
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    # Generation parameters
    temperature: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    max_tokens: int = int(os.getenv("OPENAI_MAX_TOKENS", "512"))

    # Conversation management
    max_history: int = int(os.getenv("MAX_CONVERSATION_HISTORY", "20"))

    # System prompt
    system_prompt: str = os.getenv(
        "SYSTEM_PROMPT",
        "You are a helpful, concise assistant in a command-line chat.",
    )

    # Debug logging
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"


settings = Settings()

if settings.debug:
    # Basic debug output without logging sensitive data
    key_preview = (
        settings.openai_api_key[:4] + "..." + settings.openai_api_key[-4:]
        if settings.openai_api_key and len(settings.openai_api_key) > 8
        else "(not set or very short)"
    )
    print("✓ Chatbot config loaded")
    print(f"  Model: {settings.openai_model}")
    print(f"  API key: {key_preview}")
    print(f"  Temperature: {settings.temperature}")
    print(f"  Max tokens: {settings.max_tokens}")
    print(f"  Max history: {settings.max_history}")


