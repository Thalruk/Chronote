import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // <-- DODANO 'of'
import { environment } from '../../environments/environment';

export interface Note {
  id?: string;
  title: string;
  content: string;
  userId?: string;
  targetDate?: Date | string | null;
  targetTime?: string;
  createdAt?: Date | string;
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notes`;

  private get isGuest(): boolean {
    return localStorage.getItem('guest_mode') === 'true';
  }

  private get guestNotes(): Note[] {
    return JSON.parse(localStorage.getItem('guest_notes') || '[]');
  }

  private saveGuestNotes(notes: Note[]) {
    localStorage.setItem('guest_notes', JSON.stringify(notes));
  }

  getNotes(): Observable<Note[]> {
    if (this.isGuest) return of(this.guestNotes);
    return this.http.get<Note[]>(this.apiUrl);
  }

  createNote(note: Partial<Note>): Observable<Note> {
    if (this.isGuest) {
      const newNote = { ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isArchived: note.isArchived || false } as Note;
      this.saveGuestNotes([...this.guestNotes, newNote]);
      return of(newNote);
    }
    return this.http.post<Note>(this.apiUrl, note);
  }

  updateNote(note: Note): Observable<any> {
    if (this.isGuest) {
      const updatedNotes = this.guestNotes.map(n => n.id === note.id ? note : n);
      this.saveGuestNotes(updatedNotes);
      return of(note);
    }
    return this.http.put(`${this.apiUrl}/${note.id}`, note);
  }

  deleteNote(id: string): Observable<any> {
    if (this.isGuest) {
      this.saveGuestNotes(this.guestNotes.filter(n => n.id !== id));
      return of({ success: true });
    }
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}