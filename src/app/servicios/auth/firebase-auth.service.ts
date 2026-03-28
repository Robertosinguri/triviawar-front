import { Injectable, signal, Optional, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, User, authState, signOut } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AuthUser {
    username: string;
    name?: string;
    email?: string;
    picture?: string;
    uid?: string;
}

export interface LoginCredentials {
    username: string; // En firebase usamos email
    password: string;
}

export interface SignUpData {
    username: string; // En firebase esto sería el email
    password: string;
    email: string;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class FirebaseAuthService {
    private auth = inject(Auth);
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/auth`;

    // Signals para compatibilidad con código existente
    private readonly isAuthenticated = signal(false);
    private readonly currentUser = signal<AuthUser | null>(null);
    private readonly isLoading = signal(false);
    private readonly error = signal<string | null>(null);

    readonly isAuthenticated$ = this.isAuthenticated.asReadonly();
    readonly currentUser$ = this.currentUser.asReadonly();
    readonly isLoading$ = this.isLoading.asReadonly();
    readonly error$ = this.error.asReadonly();

    constructor() {
        this.checkAuthState();
    }

    private checkAuthState() {
        // Mantenemos esto para detectar si ya hay una sesión de Firebase activa 
        // o si queremos sincronizar con el token que recibimos del backend
        authState(this.auth).subscribe((user: User | null) => {
            if (user) {
                this.updateSignalsFromFirebase(user);
            } else {
                // Si no hay user en firebase client, vemos si tenemos algo en localstorage (opcional)
                this.isAuthenticated.set(false);
                this.currentUser.set(null);
            }
        });
    }

    private updateSignalsFromFirebase(user: User) {
        this.currentUser.set({
            username: user.email?.split('@')[0] || 'User', // Fallback username
            email: user.email || '',
            name: user.displayName || '',
            picture: user.photoURL || '',
            uid: user.uid
        });
        this.isAuthenticated.set(true);
    }

    private updateSignals(userData: any) {
        this.currentUser.set({
            username: userData.username,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            uid: userData.uid
        });
        this.isAuthenticated.set(true);
    }

    async login(credentials: LoginCredentials): Promise<boolean> {
        this.isLoading.set(true);
        this.error.set(null);
        try {
            const response: any = await this.http.post(`${this.API_URL}/login`, {
                email: credentials.username, // El backend espera email
                password: credentials.password
            }).toPromise();

            if (response.success) {
                this.updateSignals(response.user);
                // Opcional: Podríamos persistir el token si fuera necesario, 
                // pero por ahora actualizamos signals.
                return true;
            }
            return false;
        } catch (e: any) {
            this.error.set(e.error?.message || 'Error en el login');
            return false;
        } finally {
            this.isLoading.set(false);
        }
    }

    async signUp(data: SignUpData): Promise<boolean> {
        this.isLoading.set(true);
        this.error.set(null);
        try {
            const response: any = await this.http.post(`${this.API_URL}/signup`, {
                email: data.email,
                password: data.password,
                name: data.name
            }).toPromise();

            if (response.success) {
                this.updateSignals(response.user);
                return true;
            }
            return false;
        } catch (e: any) {
            this.error.set(e.error?.message || 'Error en el registro');
            return false;
        } finally {
            this.isLoading.set(false);
        }
    }

    async logout(): Promise<void> {
        this.isLoading.set(true);
        try {
            // Logout en el cliente si es que hay algo
            await signOut(this.auth);
            this.isAuthenticated.set(false);
            this.currentUser.set(null);
        } catch (e: any) {
            console.error(e);
        } finally {
            this.isLoading.set(false);
        }
    }

    async actualizarAvatar(avatarFileName: string): Promise<boolean> {
        const user = this.currentUser();
        if (!user || !user.uid) {
            console.error('❌ No hay usuario o UID para actualizar avatar');
            return false;
        }

        this.isLoading.set(true);
        try {
            // Persistir directamente en el Backend (él se encarga de Firebase Admin y DB)
            console.log(`📤 Enviando actualización de avatar para ${user.uid}: ${avatarFileName}`);

            const response: any = await this.http.post(`${this.API_URL}/update-profile`, {
                uid: user.uid,
                picture: avatarFileName,
                name: user.name
            }).toPromise();

            if (response.success) {
                // Actualizar inmediatamente la interfaz
                this.currentUser.set({
                    ...user,
                    picture: avatarFileName
                });
                console.log('✅ Avatar guardado permanentemente');
                return true;
            }
            return false;
        } catch (e: any) {
            console.error('❌ Error al actualizar avatar:', e);
            return false;
        } finally {
            this.isLoading.set(false);
        }
    }

    // Compatibilidad con métodos antiguos
    async confirmSignUp(username: string, code: string): Promise<boolean> {
        console.warn('Firebase no requiere confirmación manual de código en este flujo');
        return true;
    }

    async resendConfirmationCode(username: string): Promise<boolean> {
        console.warn('Firebase: Reenvío de código no implementado');
        return true;
    }

    usuarioActual() {
        return this.currentUser();
    }

    clearError() {
        this.error.set(null);
    }

    private getErrorMessage(error: any): string {
        if (error.code === 'auth/invalid-credential') return 'Credenciales incorrectas';
        if (error.code === 'auth/email-already-in-use') return 'El email ya está registrado';
        return error.message;
    }
}
