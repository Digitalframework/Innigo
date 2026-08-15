import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from './layout/top-nav/top-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
