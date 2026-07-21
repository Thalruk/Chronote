import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

    private apiUrl = `${environment.apiUrl}/notes`;

    getNotes(): Observable<Note[]> {
        return this.http.get<Note[]>(this.apiUrl);
    }

    createNote(note: Partial<Note>): Observable<Note> {
        return this.http.post<Note>(this.apiUrl, note);
    }
}