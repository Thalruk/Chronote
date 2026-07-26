import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService, Note } from './services/note';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Column } from "./column/column";
import { GoogleSigninButtonModule, SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule, Column, GoogleSigninButtonModule],
  templateUrl: './app.html'
})
export class App implements OnInit {
  private noteService = inject(NoteService);
  private authService = inject(SocialAuthService);

  user: SocialUser | null = null;
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
      error: (err) => console.error('Communication error:', err)
    });
    this.authService.authState.subscribe((user) => {
      this.user = user;

      if (user) {
        console.log('Zalogowano poprawnie pomyślnie!');
        console.log('Oto ID Token, który zaraz wyślemy do naszego backendu C#:', user.idToken);
      }
    });
  }

  logOut() {
    this.authService.signOut();
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
      // Future step: send a PUT request to the backend to update the status in the database
    }
  }
}