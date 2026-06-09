import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';
import { resolveAvatarUrl } from '../../servicios/avatar-utils';

@Component({
  selector: 'app-podium',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="podium-wrapper">
      <div class="podium-bg" [style.--bg]="'url(' + podiumBg + ')'">
        <!-- 1RO -->
        <div class="podium-spot spot-1">
          <img class="avatar bounce-1" [src]="avatarUrl(0)" [alt]="name(0)"
            (error)="onImgError($event)" />
          <span class="name name-gold">{{ name(0) }}</span>
        </div>

        <!-- 2DO -->
        <div class="podium-spot spot-2">
          <img class="avatar bounce-2" [src]="avatarUrl(1)" [alt]="name(1)"
            (error)="onImgError($event)" />
          <span class="name name-cyan">{{ name(1) }}</span>
        </div>

        <!-- 3RO -->
        <div class="podium-spot spot-3">
          <img class="avatar bounce-3" [src]="avatarUrl(2)" [alt]="name(2)"
            (error)="onImgError($event)" />
          <span class="name name-purple">{{ name(2) }}</span>
        </div>
      </div>

      <a routerLink="/ranking" class="podium-link">Ver ranking completo →</a>
    </div>
  `,
  styles: [`
    .podium-wrapper {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }

    .podium-bg {
      position: relative;
      width: 100%;
      padding-top: 75%; /* 4:3 aspect ratio (800x600) */
    }

    .podium-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: var(--bg);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.8;
    }

    .podium-spot {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
    }

    .spot-1 { left: 50%; top: 40%; }
    .spot-2 { left: 24%; top: 47%; }
    .spot-3 { left: 79%; top: 55%; }

    .avatar {
      border-radius: 50%;
      object-fit: cover;
      background: #1a1a2e;
    }

    .spot-1 .avatar { width: 65px; height: 65px; border: 2px solid #e6bd00; }
    .spot-2 .avatar { width: 65px; height: 65px; border: 2px solid #00cfe6; }
    .spot-3 .avatar { width: 65px; height: 65px; border: 2px solid #c7b0e6; }

    .name {
      font-family: 'Red Hat Display', sans-serif;
      font-weight: 600;
      text-align: center;
      margin-top: 4px;
      max-width: 70px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .name-gold  { color: #e6bd00; font-size: 0.75rem; }
    .name-cyan  { color: #00cfe6; font-size: 0.65rem; }
    .name-purple{ color: #bc9ee4; font-size: 0.6rem; }

    .bounce-1 { animation: jump-1 0.7s ease-in-out infinite; }
    .bounce-2 { animation: jump-2 0.9s ease-in-out infinite; }
    .bounce-3 { animation: jump-3 1.1s ease-in-out infinite; }

    @keyframes jump-1 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes jump-2 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes jump-3 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .podium-link {
      display: block;
      text-align: center;
      color: #e6bd00;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      text-decoration: none;
      font-family: 'Red Hat Display', sans-serif;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .podium-link:hover { opacity: 1; text-decoration: underline; }
  `]
})
export class PodiumComponent {
  @Input() top3: JugadorRanking[] = [];

  podiumBg = resolveAvatarUrl('podio.webp');

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = resolveAvatarUrl(null);
  }

  name(i: number): string {
    const p = this.top3[i];
    if (!p) return '---';
    return p.nombre.length > 12 ? p.nombre.slice(0, 11) + '...' : p.nombre;
  }

  avatarUrl(i: number): string {
    const p = this.top3[i];
    return resolveAvatarUrl(p?.picture);
  }
}
