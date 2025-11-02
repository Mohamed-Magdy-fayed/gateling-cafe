'use client';

import type { SessionPayload } from '@/auth/nextjs/schemas';
import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

interface AuthContextType {
    session: SessionPayload | null;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, session }: { children: ReactNode, session: SessionPayload | null }) {
    const isAuthenticated = useMemo(() => session !== null, [session]);

    return (
        <AuthContext.Provider value={{
            session,
            isAuthenticated,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
