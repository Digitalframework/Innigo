import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';

import { UserStore, Address } from '../../core/user-store';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink, NzIconModule, NzInputModule, NzUploadModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  protected readonly userStore = inject(UserStore);
  private readonly message = inject(NzMessageService);

  protected readonly editingName = signal(false);
  protected readonly nameDraft = signal('');

  protected readonly editingEmail = signal(false);
  protected readonly emailDraft = signal('');

  protected readonly changingPassword = signal(false);
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  protected readonly editingAddress = signal(false);
  protected readonly addressDraft = signal<Address>({ street: '', postalCode: '', city: '', country: '' });

  protected readonly editingPayment = signal(false);
  protected readonly cardNumberDraft = signal('');
  protected readonly cardExpiryDraft = signal('');

  protected readonly avatarBeforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = file as unknown as File;
    const reader = new FileReader();
    reader.onload = () => {
      this.userStore.updateAvatar(reader.result as string);
      this.message.success('Profilbild aktualisiert.');
    };
    reader.readAsDataURL(rawFile);
    return false;
  };

  protected startEditName(): void {
    this.nameDraft.set(this.userStore.name());
    this.editingName.set(true);
  }

  protected saveName(): void {
    const value = this.nameDraft().trim();
    if (value) this.userStore.name.set(value);
    this.editingName.set(false);
    this.message.success('Benutzername gespeichert.');
  }

  protected startEditEmail(): void {
    this.emailDraft.set(this.userStore.email());
    this.editingEmail.set(true);
  }

  protected saveEmail(): void {
    const value = this.emailDraft().trim();
    if (value) this.userStore.email.set(value);
    this.editingEmail.set(false);
    this.message.success('E-Mail-Adresse gespeichert.');
  }

  protected togglePasswordForm(): void {
    this.changingPassword.update((v) => !v);
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  protected submitPassword(): void {
    if (!this.newPassword() || this.newPassword() !== this.confirmPassword()) {
      this.message.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    this.message.success('Passwort erfolgreich geändert.');
    this.togglePasswordForm();
  }

  protected startEditAddress(): void {
    this.addressDraft.set({ ...this.userStore.address() });
    this.editingAddress.set(true);
  }

  protected saveAddress(): void {
    this.userStore.address.set({ ...this.addressDraft() });
    this.editingAddress.set(false);
    this.message.success('Adresse gespeichert.');
  }

  protected startEditPayment(): void {
    this.cardNumberDraft.set('');
    this.cardExpiryDraft.set('');
    this.editingPayment.set(true);
  }

  protected savePayment(): void {
    const digits = this.cardNumberDraft().replace(/\s/g, '');
    if (digits.length < 4 || !this.cardExpiryDraft().trim()) {
      this.message.error('Bitte gültige Kartendaten eingeben.');
      return;
    }
    this.userStore.paymentMethod.set({
      brand: 'Karte',
      last4: digits.slice(-4),
      expiry: this.cardExpiryDraft().trim(),
    });
    this.editingPayment.set(false);
    this.message.success('Zahlungsmethode aktualisiert.');
  }
}
