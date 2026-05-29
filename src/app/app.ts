import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackgroundComponent } from './componentes/background/background';

/**
 * Componente raíz de la aplicación MVPP Web
 * Maneja la navegación principal y el estado global
*/

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [RouterOutlet, BackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('MVPP Web - Desafío Grupal');
  protected readonly version = signal('1.0.0');
}