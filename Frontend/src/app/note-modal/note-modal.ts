import { Component, EventEmitter, Output, input, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note } from '../services/note';
@Component({
  selector: 'app-note-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-modal.html',
})
export class NoteModal {
  isOpen = input.required<boolean>();
  noteData = input<Partial<Note> | null>(null);

  @Output() save = new EventEmitter<Partial<Note>>();
  @Output() close = new EventEmitter<void>();

  title = '';
  content = '';
  targetDate = '';
  targetTime = '';

  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const data = this.noteData();
        this.title = data?.title || '';
        this.content = data?.content || '';

        if (data?.targetDate) {
          this.targetDate = new Date(data.targetDate).toISOString().split('T')[0];
        } else {
          this.targetDate = '';
        }
        this.targetTime = data?.targetTime ? data.targetTime.substring(0, 5) : '';
        setTimeout(() => {
          this.titleInput?.nativeElement.focus();
        }, 50);
      }
    });
  }

  onSave() {
    let timeToSend = null;
    if (this.targetTime) {
      timeToSend = this.targetTime.length === 5 ? `${this.targetTime}:00` : this.targetTime;
    }
    const result: Partial<Note> = {
      ...(this.noteData() || {}),
      title: this.title,
      content: this.content,
      targetDate: this.targetDate ? new Date(this.targetDate).toISOString() : null,
      targetTime: this.targetTime || undefined,
    };

    this.save.emit(result);
  }
}
