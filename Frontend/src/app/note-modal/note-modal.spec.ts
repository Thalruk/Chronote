import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteModal } from './note-modal';

describe('NoteModal', () => {
  let component: NoteModal;
  let fixture: ComponentFixture<NoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteModal],
    }).compileComponents();

    fixture = TestBed.createComponent(NoteModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
