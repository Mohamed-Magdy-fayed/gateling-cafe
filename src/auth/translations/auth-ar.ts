import type { LanguageMessages } from "@/lib/i18n/lib";

export default {
    auth: {
        or: "أو",
        setPassword: "تعيين كلمة المرور",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        confirmPassword: "تأكيد كلمة المرور",
        confirmPasswordPlaceholder: "تأكيد كلمة المرور",
        passwordMismatch: "كلمات المرور غير متطابقة",
        passwordMinLength: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
        passwordLowercase: "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل",
        passwordUppercase: "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل",
        passwordNumber: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
        passwordSpecialChar: "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل",
        email: "البريد الإلكتروني",
        placeholder: "you@example.com",
        backToHome: 'العودة إلى الصفحة الرئيسية',
        emailPlaceholder: 'name@example.com',
        signIn: {
            title: 'تسجيل الدخول',
            description: 'أدخل بريدك الإلكتروني أدناه لتسجيل الدخول إلى حسابك',
            success: 'لقد قمت بتسجيل الدخول بنجاح',
            tooltip: 'تسجيل الدخول',
        },
        signOut: "تسجيل الخروج",
        error: {
            title: 'خطأ في المصادقة',
            description: 'حدث خطأ أثناء المصادقة. يرجى المحاولة مرة أخرى.',
            tryAgain: 'يرجى المحاولة مرة أخرى.',
            signInAgain: 'تسجيل الدخول مرة أخرى',
            badRequest: "طلب غير صالح!",
            noUser: "البيانات غير صالحة!",
            noPassword: "يرجى إعداد كلمة المرور أولاً!",
            credentials: "البيانات غير صالحة!",
        },
    },
} as const satisfies LanguageMessages;