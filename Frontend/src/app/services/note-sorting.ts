import { Injectable } from '@angular/core';
import { Note } from './note';
import { ColumnType } from '../models/column-type';
import { isBefore, isSameDay, addDays, endOfWeek, isWithinInterval, startOfDay, nextSunday, addWeeks } from 'date-fns';

export interface SortedNotes {
    missed: Note[];
    today: Note[];
    tomorrow: Note[];
    thisWeek: Note[];
    nextWeek: Note[];
    later: Note[];
}

@Injectable({
    providedIn: 'root'
})
export class NoteSortingService {

    distribute(notes: Note[]): SortedNotes {
        const result: SortedNotes = { missed: [], today: [], tomorrow: [], thisWeek: [], nextWeek: [], later: [] };

        const now = startOfDay(new Date());
        const tomorrow = addDays(now, 1);
        const endOfThis = endOfWeek(now, { weekStartsOn: 1 });
        const endOfNext = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        notes.forEach(note => {
            if (!note.targetDate) {
                result.later.push(note);
                return;
            }

            const target = startOfDay(new Date(note.targetDate));

            if (isBefore(target, now)) result.missed.push(note);
            else if (isSameDay(target, now)) result.today.push(note);
            else if (isSameDay(target, tomorrow)) result.tomorrow.push(note);
            else if (isWithinInterval(target, { start: addDays(tomorrow, 1), end: endOfThis })) result.thisWeek.push(note);
            else if (isWithinInterval(target, { start: addDays(endOfThis, 1), end: endOfNext })) result.nextWeek.push(note);
            else result.later.push(note);
        });

        const sortAsc = (a: Note, b: Note) => {
            const getSortTime = (note: Note) => {
                if (!note.targetDate) return new Date(note.createdAt || 0).getTime();

                const date = new Date(note.targetDate);

                if (note.targetTime) {
                    const parts = note.targetTime.split(':').map(Number);
                    date.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
                } else {
                    date.setHours(23, 59, 59, 999);
                }

                return date.getTime();
            };

            return getSortTime(a) - getSortTime(b);
        };

        Object.values(result).forEach(arr => arr.sort(sortAsc));
        return result;
    }

    calculateTargetDate(column: ColumnType): string | null {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        switch (column) {
            case ColumnType.Missed: return addDays(today, -1).toISOString();
            case ColumnType.Today: return today.toISOString();
            case ColumnType.Tomorrow: return addDays(today, 1).toISOString();
            case ColumnType.ThisWeek: return nextSunday(today).toISOString();
            case ColumnType.NextWeek: return nextSunday(addWeeks(today, 1)).toISOString();
            case ColumnType.Later:
            default: return null;
        }
    }
}