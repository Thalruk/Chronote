import { Component, EventEmitter, Output, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './settings-modal.html'
})
export class SettingsModal {
  isOpen = input.required<boolean>();
  isDarkMode = input.required<boolean>();

  @Output() close = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();

  private translateService = inject(TranslateService);

  get currentLang() {
    return this.translateService.currentLang || 'en';
  }

  switchLang(lang: string) {
    this.translateService.use(lang);
  }
}