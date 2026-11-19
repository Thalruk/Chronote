import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AiService, ExtractedTask } from '../services/ai-service';

@Component({
  selector: 'app-brain-dump-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brain-dump-modal.html',
})
export class BrainDumpModalComponent implements OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() tasksCreated = new EventEmitter<ExtractedTask[]>();

  public readonly brainDumpText = signal('');
  public readonly isRecording = signal(false);
  public readonly isTranscribing = signal(false);
  public readonly isSubmitting = signal(false);
  public readonly errorMessage = signal('');

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;

  constructor(private readonly aiService: AiService) {}

  public async startRecording(): Promise<void> {
    this.errorMessage.set('');

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage.set('Microphone access is not supported in this browser.');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.releaseStream();
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.sendAudioForTranscription(audioBlob);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch {
      this.releaseStream();
      this.errorMessage.set('Microphone permission denied or unavailable.');
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.isRecording.set(false);
      this.mediaRecorder.stop();
    }
  }

  private sendAudioForTranscription(audioBlob: Blob): void {
    if (audioBlob.size === 0) {
      this.errorMessage.set('Recorded audio is empty.');
      return;
    }

    this.isTranscribing.set(true);
    this.errorMessage.set('');

    this.aiService
      .transcribeAudio(audioBlob)
      .pipe(finalize(() => this.isTranscribing.set(false)))
      .subscribe({
        next: (response) => {
          if (response.transcription) {
            this.brainDumpText.update((current) => {
              const separator = current.trim() ? '\n' : '';
              return `${current}${separator}${response.transcription}`.trim();
            });
          }
        },
        error: () => {
          this.errorMessage.set('Failed to transcribe audio.');
        },
      });
  }

  public submitBrainDump(): void {
    const trimmed = this.brainDumpText().trim();
    if (!trimmed || this.isRecording() || this.isTranscribing() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.aiService
      .extractTasksFromText(trimmed)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          const tasks = response.tasks ?? [];
          if (tasks.length === 0) {
            this.errorMessage.set('No tasks could be extracted from the text.');
            return;
          }

          this.tasksCreated.emit(tasks);
          this.brainDumpText.set('');
          this.resetAndClose();
        },
        error: () => {
          this.errorMessage.set('Failed to create notes from text.');
        },
      });
  }

  public onClose(): void {
    if (this.isRecording()) {
      this.stopRecording();
    }
    this.resetAndClose();
  }

  private resetAndClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }

  private releaseStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public ngOnDestroy(): void {
    this.releaseStream();
  }
}
