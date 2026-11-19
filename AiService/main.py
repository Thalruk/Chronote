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
print(
    f"Whisper model loaded (Device: {whisper_model.model.device}, "
    f"Compute type: {whisper_model.model.compute_type})."
)


class ExtractedTask(BaseModel):
    title: str = Field(description="Short, concise task title")
    content: str = Field(description="Detailed description or context of the task")
    targetDate: Optional[str] = Field(
        default=None,
        description="Target date in YYYY-MM-DD format inferred from the speech, or null if not specified",
    )
    targetTime: Optional[str] = Field(
        default=None,
        description=(
            "Target time in 24-hour HH:MM format (e.g. '10:00', '13:00', '16:00') "
            "whenever a time of day is mentioned in the speech, otherwise null"
        ),
    )


class ExtractionResponse(BaseModel):
    transcription: str
    tasks: List[ExtractedTask]


class LLMTaskList(BaseModel):
    tasks: List[ExtractedTask]


class TranscriptionResponse(BaseModel):
    transcription: str


class TextToTasksRequest(BaseModel):
    text: str
    current_date: Optional[str] = None


def save_upload_to_temp(audio: UploadFile) -> str:
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = Path(audio.filename).suffix or ".audio"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(audio.file.read())
        return tmp_file.name


def transcribe_file(audio_path: str) -> str:
    segments, _ = whisper_model.transcribe(audio_path, beam_size=5)
    return " ".join(segment.text for segment in segments).strip()


def extract_tasks_from_text(text: str, current_date: str) -> List[ExtractedTask]:
    if not text.strip():
        return []

    system_prompt = (
        f"You are a productivity assistant. Today's date is {current_date}. "
        "Analyze the user's chaotic brain dump and break it down into concrete, actionable tasks. "
        "Extract targetDate (YYYY-MM-DD) for relative dates like 'dzisiaj', 'jutro', 'wczoraj'. "
        "Extract targetTime (HH:MM) whenever any hour/time is mentioned (e.g. 'o 13.00' -> '13:00', 'o 10' -> '10:00'). "
        "Strictly preserve the original language spoken by the user."
    )

    response = ollama.chat(
        model="qwen2.5:7b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        format=LLMTaskList.model_json_schema(),
        options={"temperature": 0.1},
    )

    parsed_tasks = LLMTaskList.model_validate_json(response.message.content)
    return parsed_tasks.tasks


@app.post("/api/ai/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    tmp_path = save_upload_to_temp(audio)
    try:
        transcribed_text = transcribe_file(tmp_path)
        return TranscriptionResponse(transcription=transcribed_text)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/ai/text-to-tasks", response_model=LLMTaskList)
async def text_to_tasks(payload: TextToTasksRequest):
    ref_date = payload.current_date or date.today().isoformat()
    tasks = extract_tasks_from_text(payload.text, ref_date)
    return LLMTaskList(tasks=tasks)


@app.post("/api/ai/voice-to-tasks", response_model=ExtractionResponse)
async def process_voice_note(
    audio: UploadFile = File(...),
    current_date: str = Form(default_factory=lambda: date.today().isoformat()),
):
    tmp_path = save_upload_to_temp(audio)
    try:
        transcribed_text = transcribe_file(tmp_path)
        if not transcribed_text:
            return ExtractionResponse(transcription="", tasks=[])

        tasks = extract_tasks_from_text(transcribed_text, current_date)
        return ExtractionResponse(transcription=transcribed_text, tasks=tasks)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)