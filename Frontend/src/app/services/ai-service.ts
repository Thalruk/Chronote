import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExtractedTask {
  title: string;
  content: string;
  targetDate?: string | null;
  targetTime?: string | null;
}

export interface TranscriptionResponse {
  transcription: string;
}

export interface TextToTasksResponse {
  tasks: ExtractedTask[];
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = 'http://localhost:8000/api/ai';

  constructor(private readonly http: HttpClient) {}

  public transcribeAudio(audioBlob: Blob): Observable<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-note.webm');
    return this.http.post<TranscriptionResponse>(`${this.baseUrl}/transcribe`, formData);
  }

  public extractTasksFromText(text: string): Observable<TextToTasksResponse> {
    const currentDate = new Date().toISOString().split('T')[0];
    return this.http.post<TextToTasksResponse>(`${this.baseUrl}/text-to-tasks`, {
      text,
      current_date: currentDate,
    });
  }
}
