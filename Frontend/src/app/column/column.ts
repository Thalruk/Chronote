import { Component, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Note } from '../services/note';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './column.html',
  styleUrl: './column.css'
})
export class Column {
  title = input.required<string>();
  notes = input.required<Note[]>();

  @Output() dropped = new EventEmitter<CdkDragDrop<Note[]>>();

  onDrop(event: CdkDragDrop<Note[]>) {
    this.dropped.emit(event);
  }
}