import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from './services/note';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html'
})
export class App implements OnInit {
  private noteService = inject(NoteService);

  ngOnInit() {
    // Prosty strzał do bazy przy starcie interfejsu
    this.noteService.getNotes().subscribe({
      next: (notes) => console.log('Pobrano notatki z Supabase:', notes),
      error: (err) => console.error('Błąd komunikacji:', err)
    });
  }
}