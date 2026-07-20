import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class NoteService {
    private http = inject(HttpClient);

    // ZMIEŃ PORT NA WŁAŚCIWY DLA TWOJEGO BACKENDU!
    private apiUrl = 'https://localhost:7052/api/notes';

    getNotes(): Observable<Note[]> {
        return this.http.get<Note[]>(this.apiUrl);
    }

    createNote(note: Partial<Note>): Observable<Note> {
        return this.http.post<Note>(this.apiUrl, note);
    }
}