# LLM Loader (Groq)
from langchain_groq import ChatGroq
from app.config import settings

def get_llm():
    """Get LLM instance using Groq."""
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in .env")
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.LLM_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
        max_retries=3,
        timeout=120,
    )

def generate_response(llm, messages) -> str:
    """Helper method to generate a response from the LLM"""
    response = llm.invoke(messages)
    return response.content
