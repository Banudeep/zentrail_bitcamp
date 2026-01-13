"""
LLM Streaming Module (OpenAI-only)

This module provides a small, focused abstraction for streaming and
non‑streaming chat completions using the official OpenAI Python SDK.
It intentionally avoids any Azure‑specific logic.
"""

from __future__ import annotations

import asyncio
from typing import Awaitable, Callable, List, Dict, Any, Optional

from openai import AsyncOpenAI

from .config import settings


StreamCallback = Callable[[str], Awaitable[None]]


class LLMStream:
    """Streaming language model wrapper around the OpenAI Chat API."""

    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is required for the chatbot."
            )

        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

        self.conversation_history: List[Dict[str, Any]] = []
        self.system_prompt: str = settings.system_prompt

        if settings.debug:
            print(f"✓ Using OpenAI model: {self.model}")

    async def generate_response(
        self, user_message: str, stream_callback: Optional[StreamCallback] = None
    ) -> str:
        """
        Generate a response to `user_message`.

        If `stream_callback` is provided, tokens are streamed to it as they
        arrive and the concatenated string is returned at the end.
        """

        # Add user message to history
        self.conversation_history.append({"role": "user", "content": user_message})

        # Keep conversation history manageable
        if len(self.conversation_history) > settings.max_history:
            self.conversation_history = self.conversation_history[-settings.max_history :]

        # Prepare messages payload
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt},
            *self.conversation_history,
        ]

        # Build request parameters
        request_params: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
            "stream": stream_callback is not None,
        }

        if settings.debug:
            print(f"→ Sending request to OpenAI (stream={bool(stream_callback)})")

        try:
            response = await self.client.chat.completions.create(**request_params)

            # Streaming path
            if stream_callback:
                full_text = ""
                async for chunk in response:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        full_text += delta.content
                        await stream_callback(delta.content)

                # Add assistant reply to history
                self.conversation_history.append(
                    {"role": "assistant", "content": full_text}
                )
                return full_text

            # Non‑streaming path
            assistant_message = response.choices[0].message
            text = assistant_message.content or ""

            self.conversation_history.append({"role": "assistant", "content": text})
            return text

        except Exception as e:  # Pragmatic catch‑all, log & surface friendly message
            if settings.debug:
                print(f"❌ OpenAI error: {e!r}")
            return (
                "I ran into an error while talking to the language model. "
                "Please try again in a moment."
            )

    async def cleanup(self) -> None:
        """Placeholder for future resource cleanup (kept for API parity)."""
        # The AsyncOpenAI client currently does not require explicit cleanup.
        if settings.debug:
            print("🧹 LLMStream cleanup complete")


async def test_llm() -> None:
    """Small self‑test that sends one message and prints the reply."""

    print("Testing OpenAI chatbot...")
    llm = LLMStream()

    async def printer(chunk: str) -> None:
        print(chunk, end="", flush=True)

    # Demonstrate streaming; you can also call without the callback
    await llm.generate_response("Hello! How are you?", stream_callback=printer)
    print("\n✓ Test complete")

    await llm.cleanup()


if __name__ == "__main__":
    asyncio.run(test_llm())


