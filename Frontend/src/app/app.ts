import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NoteModal } from './note-modal/note-modal';
import { SettingsModal } from './settings-modal/settings-modal';
import { TranslatePipe } from '@ngx-translate/core';
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
import { ColumnType } from './models/column-type';
import { NoteSortingService } from './services/note-sorting';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule, Column, GoogleSigninButtonModule, NoteModal, SettingsModal, TranslatePipe],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private noteService = inject(NoteService);
  private authService = inject(SocialAuthService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private noteSortingService = inject(NoteSortingService);

  user = signal<SocialUser | null>(null);

  notesMissed = signal<Note[]>([]);
  notesToday = signal<Note[]>([]);
  notesTomorrow = signal<Note[]>([]);
  notesThisWeek = signal<Note[]>([]);
  notesNextWeek = signal<Note[]>([]);
  notesLater = signal<Note[]>([]);

  isModalOpen = signal(false);
  editingNote = signal<Partial<Note> | null>(null);
  ColumnType = ColumnType;

  isServerWakingUp = signal(false);

  isDarkMode = signal(false);
  isSettingsOpen = signal(false);
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
    this.authService.authState.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    }
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
    const slowRequestTimer = setTimeout(() => this.isServerWakingUp.set(true), 1500);

    this.noteService.getNotes().subscribe({
      next: (data) => {
        clearTimeout(slowRequestTimer);
        this.isServerWakingUp.set(false);

        const sorted = this.noteSortingService.distribute(data);

        this.notesMissed.set(sorted.missed);
        this.notesToday.set(sorted.today);
        this.notesTomorrow.set(sorted.tomorrow);
        this.notesThisWeek.set(sorted.thisWeek);
        this.notesNextWeek.set(sorted.nextWeek);
        this.notesLater.set(sorted.later);
      },
      error: (err) => {
        clearTimeout(slowRequestTimer);
        console.error('Error fetching notes:', err);

        if (err.status === 0 || err.status === 502 || err.status === 503) {
          this.isServerWakingUp.set(true);
          setTimeout(() => {
            this.loadNotes();
          }, 5000);
        } else {
          this.isServerWakingUp.set(false);
        }
      },
    });
  }


  drop(event: CdkDragDrop<Note[]>, targetColumnName: ColumnType) {
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

      movedNote.targetDate = this.noteSortingService.calculateTargetDate(targetColumnName);

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

  openModal(note?: Partial<Note>) {
    this.editingNote.set(note || null);
    this.isModalOpen.set(true);
  }

  openModalForColumn(columnName: ColumnType) {
    const prefilledDate = this.noteSortingService.calculateTargetDate(columnName);
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
  toggleDarkMode() {
    this.isDarkMode.update(dark => !dark);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}
