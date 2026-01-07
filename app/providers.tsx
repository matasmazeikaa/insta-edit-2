'use client';

import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from "next-themes"
import { AuthProvider } from './contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
        >
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    </Provider>;
} 