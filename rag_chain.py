"""
RAG Chain module for document querying using LangChain with Zilliz Cloud (Milvus) vector store.
Handles retrieval and question-answering chains with Groq LLM.
Updated for Milvus/Zilliz: Uses token auth, embedding_function, and reuses DocumentStore for consistency.
"""

import os
from typing import Optional

from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI  # For Groq/OpenRouter compatibility

from config import (
    GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL,
    MILVUS_URI, MILVUS_PASSWORD  # For Milvus token auth (user empty)
)
from embeddings import get_embeddings_model
from vectorstore import init_milvus, DocumentStore  # Reuse for correct Milvus wrapper

# ---- Retriever ----
def get_retriever(collection_name: str = "rag_langchain", k: int = 3):
    """
    Initialize Milvus vector store and return a LangChain retriever.
    
    Args:
        collection_name: Milvus collection name (underscore for validity).
        k: Number of top documents to retrieve.
    
    Returns:
        LangChain retriever instance.
    """
    embeddings = get_embeddings_model()
    init_milvus(collection_name=collection_name)  # Ensures connection and collection setup
    
    # Reuse DocumentStore for correct Milvus wrapper (avoids direct init arg errors)
    store = DocumentStore(collection_name=collection_name)
    vectorstore = store._create_langchain_wrapper()  # Handles embedding_function, token auth, schema
    
    if vectorstore is None:
        raise ValueError(f"Failed to create Milvus vectorstore for collection '{collection_name}'")
    
    return vectorstore.as_retriever(search_kwargs={"k": k})

def get_llm(model: Optional[str] = None):
    """
    Configure Groq free LLM (e.g., Llama 3.1) via LangChain ChatOpenAI.
    - Requires GROQ_API_KEY in your environment/config.
    
    Args:
        model: Optional model name override.
    
    Returns:
        LangChain LLM instance.
    """
    key = GROQ_API_KEY
    if not key:
        raise ValueError("GROQ_API_KEY not set in config or .env")
    model_name = model or GROQ_MODEL

    return ChatOpenAI(
        model=model_name,
        api_key=key,
        base_url=GROQ_BASE_URL,  # Groq API endpoint
        temperature=0.1,
        max_tokens=2048,
    )

# Alternative LLM (commented; uncomment for OpenRouter fallback)
# def get_llm(model: Optional[str] = None):
#     """
#     Configure DeepSeek-R1 (or any OpenRouter model) via LangChain ChatOpenAI.
#     - Requires OPENROUTER_API_KEY in your environment.
#     """
#     key = os.getenv("OPENROUTER_API_KEY")
#     if not key:
#         raise ValueError("OPENROUTER_API_KEY not set in .env")
#     model_name = model or "deepseek/deepseek-r1:free"

#     return ChatOpenAI(
#         model=model_name,
#         api_key=key,
#         base_url="https://openrouter.ai/api/v1",  # OpenRouter API
#         temperature=0.1,
#         max_tokens=2048,
#     )

# ---- Prompt for RAG ----
RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are a careful RAG assistant.\n"
        "Use ONLY the provided context to answer the question. "
        "If the answer is not in the context, say you don't know.\n\n"
        "Context:\n{context}\n\n"
        "Question: {question}\n\n"
        "Answer:"
    ),
)

# ---- RAG Chain ----
def get_rag_chain(collection_name: str = "rag_langchain"):
    """
    Returns a RetrievalQA chain that:
      - Retrieves top-k documents from Milvus (Zilliz Cloud)
      - Stuffs them into the prompt
      - Calls a Groq LLM
      - Returns the answer + source documents
    
    Args:
        collection_name: Milvus collection name.
    
    Returns:
        RetrievalQA chain instance.
    """
    retriever = get_retriever(collection_name=collection_name)
    llm = get_llm()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": RAG_PROMPT},
        verbose=False,
    )
    return qa_chain
