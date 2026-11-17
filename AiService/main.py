import os
import tempfile
from datetime import date
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel
import ollama

app = FastAPI(title="Chronote AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Whisper model...")
whisper_model = WhisperModel("small", device="cuda", compute_type="float16")
print("Whisper model loaded.")


class ExtractedTask(BaseModel):
    title: str = Field(description="Krótki, zwięzły tytuł zadania")
    content: str = Field(description="Szczegółowy opis lub kontekst zadania")
    targetDate: Optional[str] = Field(
        default=None, 
        description="Docelowa data w formacie YYYY-MM-DD wywnioskowana z wypowiedzi, lub null"
    )
    targetTime: Optional[str] = Field(
        default=None, 
        description="Godzina w formacie HH:MM (24h) jeśli została podana, inaczej null"
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
        raise HTTPException(status_code=400, detail="Nie podano pliku audio")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
        content = await audio.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        segments, _ = whisper_model.transcribe(tmp_path, beam_size=5)
        transcribed_text = " ".join(segment.text for segment in segments).strip()

        if not transcribed_text:
            return ExtractionResponse(transcription="", tasks=[])

        system_prompt = (
            f"Jesteś asystentem produktywności. Dzisiejsza data to {current_date}. "
            "Przeanalizuj chaotyczny słowotok użytkownika i podziel go na konkretne zadania. "
            "Zachowaj język, w którym mówił użytkownik."
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