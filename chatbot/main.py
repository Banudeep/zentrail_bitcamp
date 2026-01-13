"""
Simple command‑line chatbot entrypoint using the OpenAI‑only LLMStream.

Usage:
  1. Install dependencies:
       pip install openai
  2. Export your API key:
       export OPENAI_API_KEY="sk-..."
  3. Run:
       python -m chatbot.main
"""

from __future__ import annotations

import asyncio

from .llm_stream import LLMStream


async def chat_loop() -> None:
    llm = LLMStream()

    print("🔹 OpenAI Chatbot (type 'exit' or 'quit' to stop)")
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting chat.")
            break

        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break

        async def printer(chunk: str) -> None:
            # Stream assistant tokens as they arrive
            print(chunk, end="", flush=True)

        print("Assistant: ", end="", flush=True)
        await llm.generate_response(user_input, stream_callback=printer)
        print()  # newline after full response

    await llm.cleanup()


if __name__ == "__main__":
    asyncio.run(chat_loop())


