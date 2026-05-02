import asyncio
import json
from typing import List, Dict
from app.utils.llm import get_llm
from app.config import settings
from pathlib import Path

class IdentityVerificationService:
    def __init__(self):
        self.llm = get_llm()

    async def verify_identities(self, user_id: str, document_filenames: List[str]) -> Dict:
        """
        Analyze multiple documents to see if they belong to different people.
        Returns a report with 'has_clash' and the detected identity profiles.
        """
        print(f"\n🔍 [IdentityService] Verifying identities for user {user_id} across {len(document_filenames)} docs")
        docs_dir = settings.get_user_documents_dir(user_id)
        
        # Load all documents' data
        tasks = []
        for filename in document_filenames:
            file_path = docs_dir / filename
            extracted_path = docs_dir / f"{file_path.stem}_extracted.json"
            
            if not extracted_path.exists():
                print(f"  ⚠️ Extraction file missing: {extracted_path.name}")
                continue
                
            tasks.append(self._process_single_document(extracted_path, filename))

        if not tasks:
            print("  ⚠️ No valid extraction tasks found.")
            return {"has_clash": False, "profiles": []}

        # Run extraction in parallel
        identity_profiles = await asyncio.gather(*tasks)
        # Filter out None results
        identity_profiles = [p for p in identity_profiles if p]
        
        print(f"  Detected {len(identity_profiles)} identity profiles:")
        for p in identity_profiles:
            print(f"    - {p.get('filename')}: {p.get('person_name')} ({p.get('document_type')})")

        if len(identity_profiles) <= 1:
            print("  ✓ Not enough profiles to check for clash.")
            return {"has_clash": False, "profiles": identity_profiles}

        # Check for clashes
        clash_report = self._check_for_clashes(identity_profiles)
        print(f"  Identity clash result: {clash_report.get('has_clash')}")
        return clash_report

    async def _process_single_document(self, extracted_path: Path, filename: str) -> Dict:
        try:
            with open(extracted_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            ocr = data.get("ocr", {})
            text_content = (ocr.get("english_text", "") + "\n" + ocr.get("urdu_text", "")).strip()
            
            if not text_content:
                return None

            return await self._extract_identity_profile(text_content, filename)
        except Exception as e:
            print(f"Error processing identity for {filename}: {e}")
            return None

    async def _extract_identity_profile(self, text: str, filename: str) -> Dict:
        prompt = f"""
        Extract the identity profile of the PRIMARY OWNER of this document.
        Document: {filename}
        
        TEXT:
        {text[:5000]}
        
        Extract the following fields in JSON format:
        - person_name: The name of the PERSON THIS DOCUMENT IS FOR. 
          * For a Result Card/Transcript: The Student Name.
          * For a CNIC: The Name (English or Urdu translated).
          * For a Domicile: The Candidate Name.
          DANGER: Do not pick the Father's Name, Mother's Name, or Principal's Name.
        - id_number: CNIC number (13 digits), Passport number, or Registration number.
        - document_type: e.g., "id_card", "result_card", "domicile", "passport".
        
        Rules:
        - Output ONLY valid JSON.
        - If a field is unknown, use null.
        """
        
        try:
            resp = await self.llm.ainvoke(prompt)
            content = resp.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            
            profile = json.loads(content)
            profile["filename"] = filename
            return profile
        except Exception as e:
            print(f"LLM Error extracting identity for {filename}: {e}")
            return None

    def _check_for_clashes(self, profiles: List[Dict]) -> Dict:
        """
        Compare names and IDs across profiles.
        """
        if not profiles:
            return {"has_clash": False, "profiles": []}

        def normalize(val):
            if not val: return ""
            # Remove all non-alphanumeric characters
            return "".join(char.lower() for char in str(val) if char.isalnum())

        # Group by "likely identity" using fuzzy name AND ID matching
        groups = [] # List of lists of profiles

        for p in profiles:
            name = p.get("person_name")
            id_num = p.get("id_number")
            
            if not name and not id_num: 
                print(f"    ⚠️ Profile for {p.get('filename')} has no name or ID. Skipping check.")
                continue
            
            norm_name = normalize(name)
            norm_id = normalize(id_num)
            
            found_group = False
            for group in groups:
                # Compare with the first person in the group
                g_primary = group[0]
                g_name = normalize(g_primary.get("person_name"))
                g_id = normalize(g_primary.get("id_number"))
                
                match = False
                
                # Rule 1: ID Match (very strong)
                if norm_id and g_id and norm_id == g_id:
                    print(f"    ✓ ID Match: {norm_id} matches group {g_name}")
                    match = True
                # Rule 2: Name Fuzzy Match (only if one is a significant subset)
                elif norm_name and g_name:
                    if (norm_name in g_name or g_name in norm_name) and len(norm_name) > 3 and len(g_name) > 3:
                        print(f"    ✓ Name Match: {norm_name} matches group {g_name}")
                        match = True
                
                if match:
                    group.append(p)
                    found_group = True
                    break
            
            if not found_group:
                print(f"    + Creating new identity group for: {name or id_num}")
                groups.append([p])

        if len(groups) > 1:
            print(f"  ⚠️ CLASH DETECTED: {len(groups)} distinct identities found.")
            return {
                "has_clash": True,
                "identities": [
                    {
                        "name": group[0].get("person_name") or group[0].get("id_number") or "Unknown Identity", 
                        "documents": [
                            {"filename": g["filename"], "document_type": g.get("document_type")} 
                            for g in group
                        ]
                    }
                    for group in groups
                ],
                "message": "Documents belonging to different people detected."
            }

        return {"has_clash": False, "profiles": profiles}

identity_verification_service = IdentityVerificationService()
