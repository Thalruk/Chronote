import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteModal } from './note-modal/note-modal';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Column } from './column/column';
import {
  GoogleSigninButtonModule,
  SocialAuthService,
  SocialUser,
} from '@abacritt/angularx-social-login';
import { Note, NoteService } from './services/note';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule, Column, GoogleSigninButtonModule, NoteModal],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private noteService = inject(NoteService);
  private authService = inject(SocialAuthService);
  private http = inject(HttpClient);

  user = signal<SocialUser | null>(null);

  notesMissed = signal<Note[]>([]);
  notesToday = signal<Note[]>([]);
  notesTomorrow = signal<Note[]>([]);
  notesThisWeek = signal<Note[]>([]);
  notesNextWeek = signal<Note[]>([]);
  notesLater = signal<Note[]>([]);

  isModalOpen = signal(false);
  editingNote = signal<Partial<Note> | null>(null);

  ngOnInit() {
    const savedToken = localStorage.getItem('jwt_token');

    if (savedToken) {
      this.http
        .get<any>(`${environment.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
        .subscribe({
          next: (userData) => {
            this.user.set(userData);
            this.loadNotes();
          },
          error: (err) => {
            console.warn('Session expired, please log in again.', err);
            this.logOut();
          },
        });
    }

    this.authService.authState.subscribe({
      next: (user) => {
        if (user) {
          this.user.set(user);

          this.http
            .post<{ token: string }>(`${environment.apiUrl}/auth/google`, {
              idToken: user.idToken,
            })
            .subscribe({
              next: (response) => {
                localStorage.setItem('jwt_token', response.token);
                this.loadNotes();
              },
            });
        }
      },
    });
  }

  logOut() {
    this.authService.signOut();
    localStorage.removeItem('jwt_token');
    this.user.set(null);

    this.notesMissed.set([]);
    this.notesToday.set([]);
    this.notesTomorrow.set([]);
    this.notesThisWeek.set([]);
    this.notesNextWeek.set([]);
    this.notesLater.set([]);
  }

  loadNotes() {
    this.noteService.getNotes().subscribe({
      next: (data) => this.distributeAndSortNotes(data),
      error: (err) => console.error('Error fetching notes from database:', err),
    });
  }

  private distributeAndSortNotes(data: Note[]) {
    const missed: Note[] = [];
    const today: Note[] = [];
    const tomorrow: Note[] = [];
    const thisWeek: Note[] = [];
    const nextWeek: Note[] = [];
    const later: Note[] = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const endOfThisWeek = new Date(now);
    const daysToSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
    endOfThisWeek.setDate(now.getDate() + daysToSunday);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const endOfNextWeek = new Date(endOfThisWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
    endOfNextWeek.setHours(23, 59, 59, 999);

    data.forEach((note) => {
      if (!note.targetDate) {
        later.push(note);
        return;
      }
      const target = new Date(note.targetDate);
      target.setHours(0, 0, 0, 0);

      if (target < now) missed.push(note);
      else if (target.getTime() === now.getTime()) today.push(note);
      else if (target.getTime() === tomorrowDate.getTime()) tomorrow.push(note);
      else if (target > tomorrowDate && target <= endOfThisWeek) thisWeek.push(note);
      else if (target > endOfThisWeek && target <= endOfNextWeek) nextWeek.push(note);
      else later.push(note);
    });

    const sortAsc = (a: Note, b: Note) => {
      const timeA = a.targetDate
        ? new Date(a.targetDate).getTime()
        : new Date(a.createdAt || 0).getTime();
      const timeB = b.targetDate
        ? new Date(b.targetDate).getTime()
        : new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    };

    this.notesMissed.set(missed.sort(sortAsc));
    this.notesToday.set(today.sort(sortAsc));
    this.notesTomorrow.set(tomorrow.sort(sortAsc));
    this.notesThisWeek.set(thisWeek.sort(sortAsc));
    this.notesNextWeek.set(nextWeek.sort(sortAsc));
    this.notesLater.set(later.sort(sortAsc));
  }

  drop(event: CdkDragDrop<Note[]>, targetColumnName: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const movedNote = event.container.data[event.currentIndex];

      movedNote.targetDate = this.calculateTargetDate(targetColumnName);

      this.noteService.updateNote(movedNote).subscribe({
        next: () => {
          console.log(`Note updated! New date: ${movedNote.targetDate}`);
          // Optionally you can call this.loadNotes() here, but cards
          // have already physically moved on the frontend, so it's not required.
        },
        error: (err) => {
          console.error('Error updating note:', err);
          // In case of a server error, best practice is to revert the UI,
          // but at this stage a hard reload from the database is enough:
          this.loadNotes();
        },
      });
    }
  }

  private calculateTargetDate(column: string): string | null {
    const date = new Date();
    date.setHours(12, 0, 0, 0);

    switch (column) {
      case 'Missed':
        date.setDate(date.getDate() - 1);
        return date.toISOString();
      case 'Today':
        return date.toISOString();
      case 'Tomorrow':
        date.setDate(date.getDate() + 1);
        return date.toISOString();
      case 'This week':
        const daysToSunday = date.getDay() === 0 ? 0 : 7 - date.getDay();
        date.setDate(date.getDate() + daysToSunday);
        return date.toISOString();
      case 'Next week':
        const daysToNextSunday = (date.getDay() === 0 ? 0 : 7 - date.getDay()) + 7;
        date.setDate(date.getDate() + daysToNextSunday);
        return date.toISOString();
      case 'Later':
      default:
        return null;
    }
  }

  openModal(note?: Partial<Note>) {
    this.editingNote.set(note || null);
    this.isModalOpen.set(true);
  }

  openModalForColumn(columnName: string) {
    const prefilledDate = this.calculateTargetDate(columnName);
    const newNote: Partial<Note> = {
      targetDate: prefilledDate || undefined,
    };
    this.openModal(newNote);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingNote.set(null);
  }

  saveNote(noteData: Partial<Note>) {
    if (noteData.id) {
      this.noteService.updateNote(noteData as Note).subscribe({
        next: () => {
          this.loadNotes();
          this.closeModal();
        },
        error: (err) => console.error('Error updating note:', err),
      });
    } else {
      this.noteService.createNote(noteData).subscribe({
        next: () => {
          this.loadNotes();
          this.closeModal();
        },
        error: (err) => console.error('Error creating new note:', err),
      });
    }
  }

  deleteNote(id: string | undefined) {
    if (!id) return;

    this.noteService.deleteNote(id).subscribe({
      next: () => {
        this.loadNotes();
      },
      error: (err) => console.error('Error deleting note:', err),
    });
  }
}
