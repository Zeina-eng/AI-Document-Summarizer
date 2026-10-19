
import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from fastapi import HTTPException

# Project root
ROOT = Path(__file__).resolve().parent

# Load the API key from backend/.env when running locally
load_dotenv(ROOT / "backend" / ".env")

# On Streamlit Community Cloud, read the key from Streamlit Secrets

try:
    groq_secret = st.secrets.get("GROQ_API_KEY", "")
    if groq_secret:
        os.environ["GROQ_API_KEY"] = groq_secret
except Exception:
    pass


# Reuse your existing backend functions
from backend.app.summarizer import (
    summarize_text,
    generate_text,
    analyze_image,
)
from backend.app.utils import extract_text_from_pdf_content


st.set_page_config(
    page_title="AI Text Summarizer",
    page_icon="📝",
    layout="wide",
)

st.title("📝 AI Text Summarizer")
st.write(
    "Summarize text, generate text, or analyze images "
    "using your existing Groq integration."
)

with st.sidebar:
    st.header("AI Tools")
    mode = st.radio(
        "Choose a feature",
        ["Summarize Text", "Generate Text", "Analyze Image"],
    )

    st.divider()
    st.caption("Powered by Groq API")


def get_api_key():
    return bool(os.getenv("GROQ_API_KEY"))


if mode in ["Summarize Text", "Generate Text"]:
    st.subheader(mode)

    uploaded_file = st.file_uploader(
        "Optional: upload a TXT or PDF file",
        type=["txt", "pdf"],
        key="text_file",
    )

    text_input = st.text_area(
        "Enter your text",
        height=220,
        placeholder="Paste your text or prompt here...",
    )

    if st.button("Run AI", type="primary"):
        source_text = text_input.strip()

        if uploaded_file is not None:
            try:
                file_bytes = uploaded_file.getvalue()

                if uploaded_file.name.lower().endswith(".pdf"):
                    source_text = extract_text_from_pdf_content(
                        file_bytes
                    )
                else:
                    source_text = file_bytes.decode("utf-8-sig")

                source_text = source_text.strip()

            except Exception as exc:
                st.error(f"Could not read the file: {exc}")
                st.stop()

        if not source_text:
            st.warning("Please enter text or upload a non-empty file.")
            st.stop()

        if not get_api_key():
            st.error(
                "GROQ_API_KEY is missing. Add it to backend/.env locally "
                "or to Streamlit Cloud Secrets after deployment."
            )
            st.stop()

        try:
            with st.spinner("Processing your request..."):
                if mode == "Summarize Text":
                    result = summarize_text(source_text)
                else:
                    result = generate_text(source_text)

            st.subheader("Result")
            st.write(result)

            st.download_button(
                "Download result",
                data=result,
                file_name="ai_result.txt",
                mime="text/plain",
            )

        except HTTPException as exc:
            st.error(f"AI request failed: {exc.detail}")

            if exc.status_code in (402, 429):
                st.info(
                    "Your API provider may require available credits "
                    "or may have a usage limit. Check your Groq "
                    "account and API provider settings."
                )

        except Exception as exc:
            st.error(f"Unexpected error: {exc}")


elif mode == "Analyze Image":
    st.subheader("Analyze Image")

    image_file = st.file_uploader(
        "Upload an image",
        type=["png", "jpg", "jpeg", "webp"],
        key="image_file",
    )

    if image_file is not None:
        st.image(
            image_file,
            caption="Uploaded image",
            width=500,
        )

        if st.button("Analyze Image", type="primary"):
            if not get_api_key():
                st.error(
                    "GROQ_API_KEY is missing. Add it to backend/.env locally "
                    "or to Streamlit Cloud Secrets after deployment."
                )
                st.stop()

            try:
                with st.spinner("Analyzing the image..."):
                    result = analyze_image(
                        image_file.getvalue(),
                        image_file.type or "image/jpeg",
                    )

                st.subheader("Analysis")
                st.write(result)

                st.download_button(
                    "Download analysis",
                    data=result,
                    file_name="image_analysis.txt",
                    mime="text/plain",
                )

            except HTTPException as exc:
                st.error(f"Image analysis failed: {exc.detail}")

            except Exception as exc:
                st.error(f"Unexpected error: {exc}")
