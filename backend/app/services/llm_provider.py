import json
import os
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.core.database import get_connection

class LLMProvider:
    @staticmethod
    def get_api_key(provider: str) -> str:
        """Retrieves API key from environment or app_settings database table."""
        env_key_map = {
            "gemini": os.getenv("GEMINI_API_KEY", ""),
            "openai": os.getenv("OPENAI_API_KEY", ""),
            "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
            "groq": os.getenv("GROQ_API_KEY", "")
        }
        key = env_key_map.get(provider.lower(), "")
        if key:
            return key

        # Check DB
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM app_settings WHERE key = ?", (f"{provider}_api_key",))
            row = cursor.fetchone()
            conn.close()
            if row:
                return row["value"]
        except Exception:
            pass
        return ""

    @staticmethod
    def get_provider_status() -> Dict[str, Any]:
        """Returns the configuration status for all supported providers."""
        providers = ["gemini", "openai", "anthropic", "groq"]
        status = {}
        for p in providers:
            key = LLMProvider.get_api_key(p)
            status[p] = {
                "configured": bool(key and len(key) > 5),
                "masked_key": f"{key[:4]}...{key[-4:]}" if key and len(key) > 8 else ("Configured" if key else "")
            }
        
        active = "offline"
        for p in ["gemini", "openai", "groq", "anthropic"]:
            if status[p]["configured"]:
                active = p
                break
                
        return {
            "active_provider": active,
            "providers": status,
            "offline_engine_available": True
        }

    @classmethod
    async def call_llm(cls, system_prompt: str, user_prompt: str, provider: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Model-agnostic LLM call.
        Dispatches to Gemini, OpenAI, Groq, or Anthropic.
        If no API key is provided, returns structured error with setup prompt.
        """
        if not provider:
            status = cls.get_provider_status()
            provider = status["active_provider"]

        if provider == "offline":
            return {
                "success": False,
                "needs_api_key": True,
                "message": "No external AI API key configured. You can use the built-in offline educational tutor or configure your Gemini / OpenAI / Groq API key in Settings."
            }

        api_key = cls.get_api_key(provider)
        if not api_key:
            return {
                "success": False,
                "needs_api_key": True,
                "message": f"API key for {provider} is not configured."
            }

        try:
            if provider == "gemini":
                return await cls._call_gemini(system_prompt, user_prompt, api_key, model or settings.gemini_model)
            elif provider == "openai":
                return await cls._call_openai(system_prompt, user_prompt, api_key, model or settings.openai_model)
            elif provider == "groq":
                return await cls._call_groq(system_prompt, user_prompt, api_key, model or "llama-3.3-70b-versatile")
            else:
                return {"success": False, "error": f"Provider {provider} not implemented yet."}
        except Exception as e:
            return {"success": False, "error": f"LLM API request error: {str(e)}"}

    @staticmethod
    async def _call_gemini(system_prompt: str, user_prompt: str, api_key: str, model_name: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 3000
            }
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                return {"success": False, "error": f"Gemini error {resp.status_code}: {resp.text}"}
            data = resp.json()
            try:
                candidate = data["candidates"][0]["content"]["parts"][0]["text"]
                return {"success": True, "text": candidate, "provider": "gemini", "model": model_name}
            except (KeyError, IndexError):
                return {"success": False, "error": "Unexpected response shape from Gemini"}

    @staticmethod
    async def _call_openai(system_prompt: str, user_prompt: str, api_key: str, model_name: str) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return {"success": False, "error": f"OpenAI error {resp.status_code}: {resp.text}"}
            data = resp.json()
            return {"success": True, "text": data["choices"][0]["message"]["content"], "provider": "openai", "model": model_name}

    @staticmethod
    async def _call_groq(system_prompt: str, user_prompt: str, api_key: str, model_name: str) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return {"success": False, "error": f"Groq error {resp.status_code}: {resp.text}"}
            data = resp.json()
            return {"success": True, "text": data["choices"][0]["message"]["content"], "provider": "groq", "model": model_name}
