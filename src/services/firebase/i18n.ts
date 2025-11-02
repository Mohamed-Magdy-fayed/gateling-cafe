import { dt, type LanguageMessages } from "@/lib/i18n/lib"

export const firebaseEn = {
    fileName: "File Name",
    uploadImage: "Upload an image",
    uploading: "Uploading...",
    uploadFailed: "Upload failed",
    dropFilesHere: "Drop files here",
    dropOrClick: "Drop files here or click to browse",
    onlyOneFile: "Only one file is allowed.",
    selectedFiles: dt("Selected Files {files:number}", {}),
    acceptedFormats: dt("Accepted formats {accept}", {}),
    maxSize: dt("Max size: {maxSize:number}MB", {}),
    maxFiles: dt("Max files: {maxFiles:number}", {}),
    maxFilesAllowed: dt("Maximum {maxFiles:number} files allowed.", {}),
    fileTooLarge: dt("File '{fileName}' is too large. Max size is {maxSize:number}MB", {}),
    fileTypeNotAccepted: dt("File type for '{fileName}' is not accepted.", {}),
} as const satisfies LanguageMessages

export const firebaseAr = {
    fileName: "اسم الملف",
    uploadImage: "تحميل صورة",
    uploading: "جاري التحميل...",
    uploadFailed: "فشل التحميل",
    dropFilesHere: "اسحب الملفات هنا",
    dropOrClick: "اسحب الملفات هنا أو انقر لتصفح",
    onlyOneFile: "يسمح بملف واحد فقط.",
    selectedFiles: dt("الملفات المحددة {files:number}", {}),
    acceptedFormats: dt("الصيغ المقبولة {accept}", {}),
    maxSize: dt("أقصى حجم: {maxSize:number}MB", {}),
    maxFiles: dt("أقصى عدد من الملفات: {maxFiles:number}", {}),
    maxFilesAllowed: dt("الحد الأقصى المسموح به هو {maxFiles:number} ملفات.", {}),
    fileTooLarge: dt("الملف '{fileName}' كبير جدًا. الحد الأقصى هو {maxSize:number}MB", {}),
    fileTypeNotAccepted: dt("نوع الملف لـ '{fileName}' غير مقبول.", {}),
} as const satisfies LanguageMessages