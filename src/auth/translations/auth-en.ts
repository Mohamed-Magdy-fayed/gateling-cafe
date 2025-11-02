import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    auth: {
        or: "Or",
        setPassword: "Set Password",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        confirmPassword: "Password Confirmation",
        confirmPasswordPlaceholder: "Confirm your password",
        passwordMismatch: "Passwords do not match",
        passwordMinLength: "Password must be at least 6 characters long",
        passwordLowercase: "Password must include at least one lowercase letter",
        passwordUppercase: "Password must include at least one uppercase letter",
        passwordNumber: "Password must include at least one number",
        passwordSpecialChar: "Password must include at least one special character",
        email: "Email",
        placeholder: "you@example.com",
        backToHome: 'Back to home',
        emailPlaceholder: 'name@example.com',
        signIn: {
            title: 'Sign In',
            description: 'Enter your email below to sign in to your account',
            success: 'You have successfully signed in',
            tooltip: 'Sign in',
        },
        signOut: "Sign Out",
        error: {
            title: 'Authentication Error',
            description: 'An error occurred during authentication. Please try again.',
            tryAgain: 'Please try again.',
            signInAgain: 'Sign In Again',
            badRequest: "Invalid request!",
            noUser: "Invalid credentials!",
            noPassword: "Please setup password first!",
            credentials: "Invalid credentials!",
        },
    },
} as const satisfies LanguageMessages