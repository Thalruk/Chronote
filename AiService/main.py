import os
import tempfile
from datetime import date
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import ollama
from pydantic import BaseModel, Field

app = FastAPI(title="Chronote AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Whisper model...")
whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
print(f"Whisper model loaded (Device: {whisper_model.model.device}, Compute type: {whisper_model.model.compute_type}).")


class ExtractedTask(BaseModel):
    title: str = Field(description="Short, concise task title")
    content: str = Field(description="Detailed description or context of the task")
    targetDate: Optional[str] = Field(
        default=None,
        description="Target date in YYYY-MM-DD format inferred from the speech, or null if not specified"
    )
    targetTime: Optional[str] = Field(
        default=None,
        description="Target time in HH:MM (24-hour) format if specified, otherwise null"
    )


class ExtractionResponse(BaseModel):
    transcription: str
    tasks: List[ExtractedTask]


class LLMTaskList(BaseModel):
    tasks: List[ExtractedTask]


@app.post("/api/ai/voice-to-tasks", response_model=ExtractionResponse)
async def process_voice_note(
    audio: UploadFile = File(...),
    current_date: str = Form(default_factory=lambda: date.today().isoformat())
):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = Path(audio.filename).suffix or ".audio"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        content = await audio.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        segments, _ = whisper_model.transcribe(tmp_path, beam_size=5)
        transcribed_text = " ".join(segment.text for segment in segments).strip()

        if not transcribed_text:
            return ExtractionResponse(transcription="", tasks=[])

        system_prompt = (
            f"You are a productivity assistant. Today's date is {current_date}. "
            "Analyze the user's chaotic brain dump and break it down into concrete, actionable tasks. "
            "Strictly preserve the original language spoken by the user."
        )

        response = ollama.chat(
            model="qwen2.5:7b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcribed_text}
            ],
            format=LLMTaskList.model_json_schema(),
            options={"temperature": 0.1}
        )

        parsed_tasks = LLMTaskList.model_validate_json(response.message.content)

        return ExtractionResponse(
            transcription=transcribed_text,
            tasks=parsed_tasks.tasks
        )

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)