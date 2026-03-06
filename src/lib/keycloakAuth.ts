import Keycloak, { type KeycloakInstance } from 'keycloak-js';

export type AppRole = 'admin' | 'cemosa' | 'externo';
export type AuthProvider = 'local' | 'keycloak';

export interface AuthSession {
    role: AppRole;
    displayName: string;
    provider: AuthProvider;
    keycloak?: KeycloakInstance;
}

let keycloakClient: KeycloakInstance | null = null;
let keycloakSessionPromise: Promise<AuthSession> | null = null;

const normalizeRole = (rawRole: string | null | undefined): AppRole | null => {
    const role = (rawRole || '').trim().toLowerCase();
    if (role === 'admin') return 'admin';
    if (role === 'cemosa') return 'cemosa';
    if (role === 'externo') return 'externo';
    if (role === 'cemo' || role === 'cemosa_user') return 'cemosa';
    return null;
};

const mapRolesToAppRole = (roles: string[]): AppRole | null => {
    const normalized = new Set(roles.map((r) => r.toLowerCase()));
    if (normalized.has('admin')) return 'admin';
    if (normalized.has('cemosa') || normalized.has('cemo') || normalized.has('cemosa_user')) return 'cemosa';
    if (normalized.has('externo')) return 'externo';
    return null;
};

const createKeycloakClient = (): KeycloakInstance => {
    if (keycloakClient) return keycloakClient;

    const url = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM;
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

    if (!url || !realm || !clientId) {
        throw new Error('Faltan variables VITE_KEYCLOAK_URL / REALM / CLIENT_ID.');
    }

    keycloakClient = new Keycloak({ url, realm, clientId });
    return keycloakClient;
};

export const getAuthProvider = (): AuthProvider => {
    const provider = (import.meta.env.VITE_AUTH_PROVIDER || 'local').toLowerCase();
    return provider === 'keycloak' ? 'keycloak' : 'local';
};

export const getLocalSession = (): AuthSession | null => {
    const legacy = localStorage.getItem('currentUser');
    const modern = localStorage.getItem('currentUserRole');
    const role = normalizeRole(modern || legacy);
    if (!role) return null;
    return {
        role,
        displayName: role.toUpperCase(),
        provider: 'local'
    };
};

export const saveLocalRole = (role: AppRole): void => {
    localStorage.setItem('currentUserRole', role);
    localStorage.setItem('currentUser', role === 'externo' ? 'Externo' : 'CEMOSA');
};

export const clearLocalRole = (): void => {
    localStorage.removeItem('currentUserRole');
    localStorage.removeItem('currentUser');
};

export const initKeycloakSession = async (): Promise<AuthSession> => {
    if (keycloakSessionPromise) return keycloakSessionPromise;

    keycloakSessionPromise = (async () => {
        const keycloak = createKeycloakClient();
        const authenticated = await keycloak.init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
            checkLoginIframe: false
        });

        if (!authenticated) {
            await keycloak.login();
            throw new Error('No autenticado en Keycloak.');
        }

        const parsed = keycloak.tokenParsed || {};
        const realmRoles: string[] = Array.isArray(parsed?.realm_access?.roles) ? parsed.realm_access.roles : [];
        const resourceAccess = parsed?.resource_access || {};
        const clientRoles = Object.values(resourceAccess)
            .flatMap((client: any) => (Array.isArray(client?.roles) ? client.roles : [])) as string[];
        const role = mapRolesToAppRole([...realmRoles, ...clientRoles]);

        if (!role) {
            throw new Error('El usuario no tiene uno de los roles requeridos: admin, cemosa o externo.');
        }

        return {
            role,
            displayName: parsed?.name || parsed?.preferred_username || role.toUpperCase(),
            provider: 'keycloak',
            keycloak
        };
    })();

    try {
        return await keycloakSessionPromise;
    } catch (error) {
        keycloakSessionPromise = null;
        throw error;
    }
};

export const startKeycloakRefresh = (keycloak: KeycloakInstance): number => window.setInterval(async () => {
    try {
        await keycloak.updateToken(60);
    } catch (error) {
        console.error('Error refrescando token de Keycloak:', error);
        await keycloak.login();
    }
}, 30000);

export const logoutKeycloak = async (keycloak: KeycloakInstance): Promise<void> => {
    keycloakSessionPromise = null;
    keycloakClient = null;
    await keycloak.logout({ redirectUri: window.location.origin });
};
