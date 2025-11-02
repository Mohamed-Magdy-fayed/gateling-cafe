"use client";

import { File as FileIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import React, {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import z from "zod";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    deleteFile,
    getStoragePathFromUrl,
    IMAGES_PATH,
    isImageUrl,
    uploadFile,
} from "@/services/firebase/actions";

interface FileDropzoneProps {
    onFilesChange?: (files: FileWithMetaData[]) => void;
    setUploading?: Dispatch<SetStateAction<boolean>>;
    initialUrls?: string[];
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // in bytes
    maxFiles?: number;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export interface FileWithMetaData {
    id: string;
    file?: File;
    preview?: string;
    progress?: number;
    downloadURL?: string;
    error?: string;
    name: string;
    size?: number;
}

export default function FileDropzone({
    onFilesChange,
    setUploading,
    initialUrls = [],
    accept = "image/*", // images only
    multiple = true,
    maxSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 10,
    disabled = false,
    className = "",
    children,
}: FileDropzoneProps) {
    const { t } = useTranslation();

    const [files, setFiles] = useState<FileWithMetaData[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
    };

    const validateFile = useCallback(
        (file: File): string | null => {
            if (maxSize && file.size > maxSize) {
                return t("fileTooLarge", {
                    fileName: file.name,
                    maxSize: +(maxSize / (1024 * 1024)).toFixed(1),
                });
            }

            if (accept !== "*/*") {
                const acceptedTypes = accept
                    .split(",")
                    .map((type) => type.trim().toLowerCase());
                const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
                const mimeType = file.type.toLowerCase();

                const isAccepted = acceptedTypes.some((acceptedType) => {
                    if (acceptedType.startsWith(".")) {
                        return fileExtension === acceptedType;
                    }
                    if (acceptedType.includes("*")) {
                        const baseType = acceptedType.split("/")[0];
                        return mimeType.startsWith(baseType + "/");
                    }
                    return mimeType === acceptedType;
                });

                if (!isAccepted) {
                    return t("fileTypeNotAccepted", { fileName: file.name });
                }
            }

            return null;
        },
        [accept, maxSize, t],
    );

    const processFiles = useCallback(
        (newFiles: FileList | File[]) => {
            setError("");
            const fileArray = Array.from(newFiles);

            if (!multiple && fileArray.length > 1) {
                setError(t("onlyOneFile"));
                return;
            }

            if (files.length + fileArray.length > maxFiles) {
                setError(t("maxFilesAllowed", { maxFiles }));
                return;
            }

            for (const file of fileArray) {
                const validationError = validateFile(file);
                if (validationError) {
                    setError(validationError);
                    continue; // Skip this file and continue with others
                }

                const uniqueId = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
                const fileWithMeta: FileWithMetaData = {
                    id: uniqueId,
                    file: file,
                    preview: file.type.startsWith("image/")
                        ? URL.createObjectURL(file)
                        : undefined,
                    progress: 0,
                    name: file.name,
                    size: file.size,
                };

                setFiles((prev) =>
                    multiple ? [...prev, fileWithMeta] : [fileWithMeta],
                );

                setUploading?.(true);
                uploadFile(`${IMAGES_PATH}${file.name}`, file, (progress) => {
                    setFiles((prev) =>
                        prev.map((f) => (f.id === uniqueId ? { ...f, progress } : f)),
                    );
                })
                    .then((downloadURL) => {
                        setFiles((prev) =>
                            prev.map((f) =>
                                f.id === uniqueId ? { ...f, downloadURL, progress: 100 } : f,
                            ),
                        );
                    })
                    .catch((uploadError) => {
                        console.error("Upload failed:", uploadError);
                        setFiles((prev) =>
                            prev.map((f) =>
                                f.id === uniqueId
                                    ? { ...f, error: t("uploadFailed"), progress: undefined }
                                    : f,
                            ),
                        );
                    });
            }
        },
        [files.length, multiple, maxFiles, validateFile, setUploading, t],
    );

    const removeFile = useCallback(
        (idToRemove: string) => {
            const res = z.string().url().safeParse(idToRemove);
            const fileToRemove = files.find((f) => f.id === idToRemove);

            if (res.success) {
                const FilePath = getStoragePathFromUrl(res.data);
                if (!fileToRemove || !FilePath) return;

                deleteFile(FilePath).catch((err) => {
                    console.error("Failed to delete file from storage:", err);
                });
            }

            if (!fileToRemove) return;

            if (fileToRemove.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }

            if (fileToRemove.downloadURL) {
                deleteFile(`temp/lectures/${fileToRemove.file?.name}`).catch((err) => {
                    console.error("Failed to delete file from storage:", err);
                });
            }

            setFiles((prevFiles) => prevFiles.filter((f) => f.id !== idToRemove));
        },
        [files],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setIsDragOver(true);
        },
        [disabled],
    );
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            if (!disabled && e.dataTransfer.files.length > 0)
                processFiles(e.dataTransfer.files);
        },
        [disabled, processFiles],
    );
    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) processFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        [processFiles],
    );
    const handleClick = useCallback(() => {
        if (!disabled) fileInputRef.current?.click();
    }, [disabled]);

    // Effect to notify parent component of file changes
    useEffect(() => {
        onFilesChange?.(files);
    }, [files, onFilesChange]);

    // Effect for cleaning up object URLs on unmount
    useEffect(() => {
        setUploading?.(files.some((file) => file.progress && file.progress < 100));

        return () => {
            files.forEach((file) => {
                if (file.preview) URL.revokeObjectURL(file.preview);
            });
        };
    }, [files, setUploading]);

    // This effect runs only once when the component mounts or initialUrls change.
    useEffect(() => {
        if (initialUrls.length > 0 && files.length === 0) {
            const initialFiles: FileWithMetaData[] = initialUrls.map((url) => ({
                id: url,
                downloadURL: url,
                name: getStoragePathFromUrl(url)?.split("/").pop() || t("fileName"),
                progress: 100,
            }));
            setFiles(initialFiles);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialUrls, t, files.length]);

    return (
        <div className={`w-full ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled}
            />

            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                    ${isDragOver
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border hover:border-primary/40"
                    }
                    ${disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/40 dark:hover:bg-muted/30"
                    }
                `}
            >
                {children ? (
                    children
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Upload
                            className={`w-12 h-12 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <div>
                            <p className="text-lg font-medium text-foreground">
                                {isDragOver ? t("dropFilesHere") : t("dropOrClick")}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {accept !== "*/*" && t("acceptedFormats", { accept })}
                                {maxSize &&
                                    ` • ${t("maxSize", { maxSize: +(maxSize / (1024 * 1024)).toFixed(1) })}`}
                                {multiple && ` • ${t("maxFiles", { maxFiles })}`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                        {t("selectedFiles", { files: files.length })}
                    </h4>
                    <div className="space-y-2">
                        {files.map((fileWithMeta) => (
                            <div
                                key={fileWithMeta.id}
                                className="relative flex items-center justify-between overflow-hidden rounded-lg bg-muted/30 p-3"
                            >
                                {/* Progress Bar */}
                                {fileWithMeta.progress !== undefined &&
                                    fileWithMeta.progress <= 100 && (
                                        <div
                                            className="absolute top-0 ltr:left-0 rtl:right-0 h-full bg-accent transition-all duration-300"
                                            style={{ width: `${fileWithMeta.progress}%` }}
                                        />
                                    )}
                                {fileWithMeta.error && (
                                    <div className="absolute top-0 left-0 h-full w-full bg-destructive/15" />
                                )}

                                <div className="relative flex items-center space-x-3 flex-1 min-w-0 z-10">
                                    {fileWithMeta.preview ? (
                                        <Image
                                            width={100}
                                            height={100}
                                            src={fileWithMeta.preview}
                                            alt={fileWithMeta.name}
                                            className="w-10 h-10 object-cover rounded shrink-0"
                                        />
                                    ) : fileWithMeta.downloadURL &&
                                        isImageUrl(fileWithMeta.downloadURL) ? (
                                        // If it's an existing image URL, render it
                                        <Image
                                            width={100}
                                            height={100}
                                            src={fileWithMeta.downloadURL}
                                            alt={fileWithMeta.name}
                                            className="w-10 h-10 object-cover rounded shrink-0"
                                        />
                                    ) : (
                                        // Fallback icon
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                                            <FileIcon className="h-6 w-6 text-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground truncate w-40">
                                            {fileWithMeta.name}
                                        </p>
                                        <p className="text-xs text-foreground">
                                            {fileWithMeta.error ? (
                                                <span className="text-destructive">
                                                    {fileWithMeta.error}
                                                </span>
                                            ) : (
                                                formatFileSize(fileWithMeta.size || 1)
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(fileWithMeta.id);
                                    }}
                                    className="relative z-10 ml-2 p-1 transition-colors hover:text-destructive"
                                    disabled={disabled}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
