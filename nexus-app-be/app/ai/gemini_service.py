"""
Gemini AI service for LSP-compliant operations
Minimal version focused on LSP text processing capabilities
"""

import google.generativeai as genai
from typing import Optional, Dict, Any
import asyncio

class GeminiAIService:
    """Minimal Gemini AI service for LSP operations"""
    
    def __init__(self):
        self.model_name = "gemini-2.0-flash-exp"
        self.max_retries = 3
        self.timeout = 30
        
    def configure_api_key(self, api_key: str):
        """Configure Gemini API key for this session"""
        genai.configure(api_key=api_key)
        
    async def generate_text_enhancement(
        self,
        text: str,
        context: Optional[str] = None,
        enhancement_type: str = "enhance",
        api_key: str = None
    ) -> str:
        """
        Generate enhanced text for LSP operations
        
        Args:
            text: The text to enhance
            context: Optional context for the enhancement
            enhancement_type: Type of enhancement (enhance, expand, clarify, etc.)
            api_key: Gemini API key
            
        Returns:
            Enhanced text string
        """
        
        if api_key:
            self.configure_api_key(api_key)
            
        prompt = self._build_enhancement_prompt(text, context, enhancement_type)
        
        try:
            enhanced_text = await self._call_gemini_api(prompt)
            return enhanced_text
        except Exception as e:
            # Return original text as fallback
            return text
    
    def _build_enhancement_prompt(
        self, 
        text: str, 
        context: Optional[str] = None,
        enhancement_type: str = "enhance"
    ) -> str:
        """Build prompt for text enhancement"""
        
        prompts = {
            "enhance": f"Enhance this text to make it clearer and more impactful:\n\n{text}",
            "expand": f"Expand this text with additional details and examples:\n\n{text}",
            "clarify": f"Clarify this text to make it more understandable:\n\n{text}",
            "rewrite": f"Rewrite this text to improve its quality:\n\n{text}"
        }
        
        base_prompt = prompts.get(enhancement_type, prompts["enhance"])
        
        if context:
            base_prompt = f"Context: {context}\n\n{base_prompt}"
            
        return f"{base_prompt}\n\nReturn only the enhanced text without any additional formatting or explanation."
    
    async def _call_gemini_api(self, prompt: str) -> str:
        """Call Gemini API with error handling and retries"""
        
        model = genai.GenerativeModel(self.model_name)
        
        # Configure generation parameters
        generation_config = genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=1000,
            top_p=0.9,
            top_k=40
        )
        
        for attempt in range(self.max_retries):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                
                if response.text:
                    return response.text.strip()
                else:
                    raise Exception("Empty response from Gemini API")
                    
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise Exception(f"Gemini API error after {self.max_retries} attempts: {str(e)}")
                
                # Wait before retry
                await asyncio.sleep(2 ** attempt)
        
        raise Exception("Failed to get response from Gemini API") 