import json
from pathlib import Path
from typing import Dict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.models.form_models import FormAgentState, ProcessingStage
from app.services.docling_service import DoclingService
from app.services.llm_service import FormExtractionService


class FormProcessingAgent:
    """
    LangGraph agent for form processing workflow
    
    Workflow:
    START → Docling → LLM Extract → Validate → END
    """
    
    def __init__(self):
        """Initialize the agent with services"""
        print("🔧 Initializing Form Processing Agent...")
        
        # Initialize services
        self.docling = DoclingService()
        self.llm = FormExtractionService()
        
        # Build the graph
        self.graph = self._build_graph()
        
        print("✓ Agent ready!\n")
    
    def _build_graph(self):
        """
        Build the LangGraph workflow
        
        Graph structure:
            START
              ↓
           docling (process with Docling)
              ↓
           extract (extract fields with LLM)
              ↓
           validate (validate results)
              ↓
            END
        """
        # Create graph with our state type
        workflow = StateGraph(FormAgentState)
        
        # Add nodes (processing steps)
        workflow.add_node("docling", self._docling_node)
        workflow.add_node("extract", self._extract_node)
        workflow.add_node("validate", self._validate_node)
        
        # Add edges (flow between nodes)
        workflow.add_edge(START, "docling")
        
        # Conditional edge from docling
        workflow.add_conditional_edges(
            "docling",
            self._after_docling,
            {
                "extract": "extract",  # Success → go to extract
                "end": END             # Error → end
            }
        )
        
        # Conditional edge from extract
        workflow.add_conditional_edges(
            "extract",
            self._after_extract,
            {
                "validate": "validate",  # Success → go to validate
                "end": END               # Error → end
            }
        )
        
        # Always end after validate
        workflow.add_edge("validate", END)
        
        # Compile with memory (for checkpointing)
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)
    
    # ========================================================================
    # NODE 1: DOCLING PROCESSING
    # ========================================================================
    
    async def _docling_node(self, state: FormAgentState) -> FormAgentState:
        """
        Node 1: Process document with Docling
        Converts image/PDF to markdown and JSON
        """
        print("="*60)
        print("📄 NODE 1: DOCLING PROCESSING")
        print("="*60)
        
        try:
            # Process document
            result = await self.docling.process_document(state["file_path"])
            
            # Update state with results
            state["markdown_content"] = result["markdown"]
            state["docling_json"] = result["json"]
            state["page_count"] = result["page_count"]
            state["output_paths"].update(result["paths"])
            
            # Move to next stage
            state["current_stage"] = ProcessingStage.LLM_EXTRACT
            
            print(f"✓ Docling completed: {result['page_count']} pages\n")
            
        except Exception as e:
            error_msg = f"Docling error: {str(e)}"
            print(f"❌ {error_msg}\n")
            state["errors"].append(error_msg)
            state["current_stage"] = ProcessingStage.ERROR
        
        return state
    
    # ========================================================================
    # NODE 2: LLM EXTRACTION
    # ========================================================================
    
    async def _extract_node(self, state: FormAgentState) -> FormAgentState:
        """
        Node 2: Extract form fields with LLM
        Uses markdown and JSON to identify fields
        """
        print("="*60)
        print("🤖 NODE 2: LLM EXTRACTION")
        print("="*60)
        
        try:
            # Extract fields
            fields = await self.llm.extract_fields(
                state["markdown_content"],
                state["docling_json"]
            )
            
            # Save extracted fields
            file_path = Path(state["file_path"])
            output_path = file_path.parent / "output" / f"{file_path.stem}_fields.json"
            output_path.parent.mkdir(exist_ok=True, parents=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(fields, f, indent=2, ensure_ascii=False)
            
            # Update state
            state["extracted_fields"] = fields
            state["field_count"] = len(fields.get("form_fields", []))
            state["output_paths"]["fields"] = str(output_path)
            
            # Move to next stage
            state["current_stage"] = ProcessingStage.VALIDATE
            
            print(f"✓ Extraction completed: {state['field_count']} fields")
            print(f"✓ Saved to: {output_path}\n")
            
        except Exception as e:
            error_msg = f"LLM error: {str(e)}"
            print(f"❌ {error_msg}\n")
            state["errors"].append(error_msg)
            state["current_stage"] = ProcessingStage.ERROR
        
        return state
    
    # ========================================================================
    # NODE 3: VALIDATION
    # ========================================================================
    
    async def _validate_node(self, state: FormAgentState) -> FormAgentState:
        """
        Node 3: Validate extraction results
        Check if we got valid fields
        """
        print("="*60)
        print("✅ NODE 3: VALIDATION")
        print("="*60)
        
        try:
            # Check if we have fields
            if not state["extracted_fields"].get("form_fields"):
                state["errors"].append("No fields extracted")
                print("⚠️  No fields found\n")
            
            # Check structure
            required_keys = ["form_fields", "instructions", "special_areas"]
            if not all(k in state["extracted_fields"] for k in required_keys):
                state["errors"].append("Invalid extraction structure")
                print("⚠️  Invalid structure\n")
            
            # If we have errors, mark as error
            if state["errors"]:
                state["current_stage"] = ProcessingStage.ERROR
            else:
                # Success!
                state["success"] = True
                state["current_stage"] = ProcessingStage.COMPLETE
                print(f"✓ Validation passed!")
                print(f"✓ Total fields: {state['field_count']}")
                print(f"✓ Instructions: {len(state['extracted_fields'].get('instructions', []))}")
                print(f"✓ Special areas: {len(state['extracted_fields'].get('special_areas', []))}\n")
        
        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            print(f"❌ {error_msg}\n")
            state["errors"].append(error_msg)
            state["current_stage"] = ProcessingStage.ERROR
        
        return state
    
    # ========================================================================
    # ROUTING FUNCTIONS
    # ========================================================================
    
    def _after_docling(self, state: FormAgentState) -> str:
        """Decide where to go after docling node"""
        if state["current_stage"] == ProcessingStage.ERROR:
            return "end"
        return "extract"
    
    def _after_extract(self, state: FormAgentState) -> str:
        """Decide where to go after extract node"""
        if state["current_stage"] == ProcessingStage.ERROR:
            return "end"
        return "validate"
    
    # ========================================================================
    # PUBLIC API
    # ========================================================================
    
    async def process(self, file_path: str, user_id: str = None) -> FormAgentState:
        """
        Process a form through the complete workflow
        
        Args:
            file_path: Path to form image or PDF
            user_id: Optional user identifier
            
        Returns:
            Final state with all results
        """
        print("\n" + "="*60)
        print("🚀 STARTING FORM PROCESSING WORKFLOW")
        print("="*60)
        print(f"📄 File: {file_path}")
        print(f"👤 User: {user_id or 'N/A'}")
        print()
        
        # Create initial state
        initial_state = FormAgentState(
            file_path=file_path,
            user_id=user_id,
            current_stage=ProcessingStage.DOCLING_CONVERT,
            errors=[],
            markdown_content=None,
            docling_json=None,
            page_count=None,
            extracted_fields=None,
            field_count=None,
            success=False,
            output_paths={}
        )
        
        # Run the workflow
        config = {"configurable": {"thread_id": user_id or "default"}}
        
        final_state = None
        async for state in self.graph.astream(initial_state, config):
            final_state = state
        
        # Extract final state
        result = list(final_state.values())[0]
        
        # Print summary
        self._print_summary(result)
        
        return result
    
    def _print_summary(self, state: FormAgentState):
        """Print workflow summary"""
        print("="*60)
        print("📊 WORKFLOW SUMMARY")
        print("="*60)
        
        if state["success"]:
            print("✅ Status: SUCCESS")
            print(f"\n📈 Results:")
            print(f"  • Pages processed: {state['page_count']}")
            print(f"  • Fields extracted: {state['field_count']}")
            print(f"  • Instructions: {len(state['extracted_fields'].get('instructions', []))}")
            print(f"  • Special areas: {len(state['extracted_fields'].get('special_areas', []))}")
            print(f"\n📁 Output files:")
            for key, path in state["output_paths"].items():
                print(f"  • {key}: {path}")
        else:
            print("❌ Status: FAILED")
            print(f"\n⚠️  Errors ({len(state['errors'])}):")
            for error in state["errors"]:
                print(f"  • {error}")
        
        print("="*60 + "\n")
