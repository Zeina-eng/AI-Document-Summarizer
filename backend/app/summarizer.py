
import os
import base64
import requests
from fastapi import HTTPException

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

TEXT_MODEL = "openai/gpt-oss-20b"
VISION_MODEL = "qwen/qwen3.8-27b"


def call_groq_api(messages, model, max_tokens=500):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is missing. Configure your Groq API key."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_completion_tokens": max_tokens,
    }

    try:
        response = requests.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=90,
        )

        if not response.ok:
            try:
                error_data = response.json()
                error_message = error_data.get("error", {}).get(
                    "message", str(error_data)
                )
            except (ValueError, AttributeError):
                error_message = response.text or "Unknown API error"

            raise HTTPException(
                status_code=response.status_code,
                detail=f"Groq API Error: {error_message}",
            )

        data = response.json()
        choices = data.get("choices", [])

        if not choices:
            raise HTTPException(
                status_code=502,
                detail="Groq returned an empty response.",
            )

        result = choices[0].get("message", {}).get("content")

        if not result:
            raise HTTPException(
                status_code=502,
                detail="Groq returned no text content.",
            )

        return result.strip()

    except HTTPException:
        raise

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to Groq: {exc}",
        )


def summarize_text(text):
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert text summarizer. Summarize the supplied "
                "text clearly and accurately. Preserve the main ideas, "
                "important facts, and conclusions. Do not invent information. "
                "Use concise paragraphs and headings when helpful."
            ),
        },
        {
            "role": "user",
            "content": f"Summarize this text:\n\n{text[:20000]}",
        },
    ]

    return call_groq_api(
        messages,
        model=TEXT_MODEL,
        max_tokens=700,
    )


def generate_text(prompt):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful AI writing assistant. Follow the user's "
                "instructions and produce clear, relevant, well-organized "
                "content. Do not claim that generated information is verified "
                "when it has not been verified."
            ),
        },
        {
            "role": "user",
            "content": prompt[:20000],
        },
    ]

    return call_groq_api(
        messages,
        model=TEXT_MODEL,
        max_tokens=1000,
    )


def analyze_image(image_bytes, mime_type):
    supported_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if mime_type not in supported_types:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WebP image.",
        )

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Describe this image clearly. Identify its main "
                        "contents and extract visible text or relevant "
                        "information when possible. Do not guess details "
                        "that cannot be determined from the image."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}"
                    },
                },
            ],
        }
    ]

    return call_groq_api(
        messages,
        model=VISION_MODEL,
        max_tokens=800,
    )
