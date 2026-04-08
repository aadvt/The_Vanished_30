import json
from pydantic import BaseModel
import structlog
from llm.base import LLMRateLimitError, LLMUnavailableError
from llm.gemini_client import GeminiClient
from llm.groq_client import GroqClient
from llm.openrouter_client import OpenRouterClient
from utils.retry import async_retry

log = structlog.get_logger()

class LLMRouter:
    def __init__(self):
        self.gemini = GeminiClient()
        self.groq = GroqClient()
        self.openrouter = OpenRouterClient()

    async def complete(self, system_prompt: str, user_prompt: str, prefer_fast: bool = False, response_as_json: bool = False) -> str:
        if prefer_fast:
            order = [self.groq, self.gemini, self.openrouter]
        else:
            order = [self.gemini, self.groq, self.openrouter]

        last_error = None
        for client in order:
            try:
                response = await client.complete(system_prompt, user_prompt, response_as_json=response_as_json)
                log.info("llm_success", client=client.__class__.__name__)
                return response
            except LLMRateLimitError as e:
                log.warning("llm_rate_limit_fallback", failed_client=client.__class__.__name__)
                last_error = e
                continue
            except Exception as e:
                log.warning("llm_provider_failed", failed_client=client.__class__.__name__, error=str(e))
                last_error = e
                continue
                
        raise LLMUnavailableError(f"All LLM providers failed. Last error: {str(last_error)}")

    async def complete_structured(self, system_prompt: str, user_prompt: str, output_model: type[BaseModel], prefer_fast: bool = False) -> BaseModel:
        from textwrap import dedent
        
        schema = output_model.model_json_schema()
        augmented_prompt = f"{user_prompt}\n\nYou must respond ONLY in valid JSON matching this schema:\n{json.dumps(schema, indent=2)}"
        
        for attempt in range(3):
            try:
                response_text = await self.complete(system_prompt, augmented_prompt, prefer_fast=prefer_fast, response_as_json=True)
                
                # Try to clean up markdown code blocks if the model wrapped the JSON
                if response_text.strip().startswith("```"):
                    lines = response_text.strip().splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    response_text = "\n".join(lines)
                
                parsed = json.loads(response_text)
                return output_model.model_validate(parsed)
            except json.JSONDecodeError as e:
                log.warning("llm_json_parse_error", error=str(e), attempt=attempt)
            except Exception as e:
                log.warning("llm_structured_validation_error", error=str(e), attempt=attempt)
                
        raise LLMUnavailableError("Failed to generate valid structured output after 3 attempts")
