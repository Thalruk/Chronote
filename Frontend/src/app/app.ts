// ... Twoje dotychczasowe importy
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, DragDropModule, Column, GoogleSigninButtonModule],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private noteService = inject(NoteService);
  private authService = inject(SocialAuthService);
  // Dodajemy klienta HTTP
  private http = inject(HttpClient);

  user = signal<SocialUser | null>(null);

  notesToday = signal<Note[]>([]);
  notesTomorrow = signal<Note[]>([]);
  notesThisWeek = signal<Note[]>([]);
  notesNextWeek = signal<Note[]>([]);
  notesLater = signal<Note[]>([]);

  ngOnInit() {
    this.noteService.getNotes().subscribe({
      next: (data) => {
        this.notesToday.set(data);
      },
      error: (err) => console.error('Backend error:', err),
    });

    this.authService.authState.subscribe({
      next: (user) => {
        this.user.set(user);

        if (user) {
          this.http
            .post<{ token: string }>(`${environment.apiUrl}/auth/google`, { idToken: user.idToken })
            .subscribe({
              next: (response) => {
                localStorage.setItem('jwt_token', response.token);
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
  }

  drop(event: CdkDragDrop<Note[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
