"""
RAG Chain module for document querying using LangChain with Milvus (Zilliz Cloud) vector store.
Uses the project's configured LLM (OpenRouter-compatible) + retriever for question answering.
"""

from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from app.config import settings
from app.utils.llm import get_llm as get_centralized_llm
from app.chatbot.vectorstore import init_milvus, DocumentStore


# ---- Retriever ----
def get_retriever(collection_name: str = "rag_langchain", k: int = 3, user_id: Optional[str] = None):
    """
    Initialize Milvus vector store and return a LangChain retriever.
    
    Args:
        collection_name: Milvus collection name (underscore for validity).
        k: Number of top documents to retrieve.
        user_id: Optional user ID for filtering documents in a shared collection.
    
    Returns:
        LangChain retriever instance.
    """
    init_milvus(collection_name=collection_name)  # Ensures connection and collection setup
    
    # Reuse DocumentStore for correct Milvus wrapper (avoids direct init arg errors)
    store = DocumentStore(collection_name=collection_name)
    vectorstore = store._create_langchain_wrapper()  # Handles embedding_function, token auth, schema
    
    if vectorstore is None:
        raise ValueError(f"Failed to create Milvus vectorstore for collection '{collection_name}'")
    
    search_kwargs = {"k": k}
    if user_id:
        # Milvus syntax for filtering on JSON field keys
        search_kwargs["expr"] = f'metadata["user_id"] == "{user_id}"'
        
    return vectorstore.as_retriever(search_kwargs=search_kwargs)


def get_llm(model: Optional[str] = None):
    """
    Configure Groq LLM using the centralized loader.
    """
    # Note: model override is ignored for now to maintain consistency with centralized config
    return get_centralized_llm()


# ---- Prompt for RAG ----
RAG_PROMPT = ChatPromptTemplate.from_template(
    "You are a careful RAG assistant.\n"
    "Use ONLY the provided context to answer the question. "
    "If the answer is not in the context, say you don't know.\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)


def format_docs(docs):
    """Helper function to format retrieved documents into a single string."""
    return "\n\n".join(doc.page_content for doc in docs)


# ---- RAG Chain ----
def get_rag_chain(collection_name: str = "rag_langchain", k: int = 3, user_id: Optional[str] = None):
    """
    Returns a RAG chain using LCEL (LangChain Expression Language) that:
      - Retrieves top-k documents from Milvus (Zilliz Cloud)
      - Formats them into the prompt
      - Calls the LLM
      - Returns the answer
    
    Args:
        collection_name: Milvus collection name.
        k: Number of documents to retrieve.
        user_id: Optional user ID for filtering documents in a shared collection.
    
    Returns:
        LCEL chain instance with invoke() method.
    """
    retriever = get_retriever(collection_name=collection_name, k=k, user_id=user_id)
    llm = get_llm()

    # Build RAG chain using LCEL
    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )
    
    return rag_chain


# Optional: If you need to return source documents as well
def get_rag_chain_with_sources(collection_name: str = "rag_langchain", k: int = 3, user_id: Optional[str] = None):
    """
    Returns a RAG chain that includes source documents in the response.
    
    Returns:
        Dict with 'result' and 'source_documents' keys.
    """
    retriever = get_retriever(collection_name=collection_name, k=k, user_id=user_id)
    llm = get_llm()

    def rag_with_sources(question: str):
        """Execute RAG and return answer with sources."""
        # Use invoke() instead of get_relevant_documents() for newer LangChain versions
        docs = retriever.invoke(question)
        context = format_docs(docs)
        
        # Generate answer using the prompt template
        # ChatPromptTemplate can be invoked directly or use format_prompt()
        prompt_value = RAG_PROMPT.format_prompt(context=context, question=question)
        answer = llm.invoke(prompt_value.to_messages()).content
        
        return {
            "result": answer,
            "source_documents": docs
        }
    
    return rag_with_sources