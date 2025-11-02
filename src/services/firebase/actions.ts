import {
    deleteObject,
    getDownloadURL,
    listAll,
    ref,
    uploadBytes,
    uploadBytesResumable,
} from "firebase/storage";
import { storage } from "./config";

export const IMAGES_PATH = "dresses";

export function isImageUrl(url: string): boolean {
    try {
        const urlObject = new URL(url);
        const pathname = urlObject.pathname;

        return /\.(jpeg|jpg|gif|png|webp)$/i.test(pathname);
    } catch {
        return false;
    }
}

export async function listFiles(path: string): Promise<string[]> {
    const dirRef = ref(storage, path);
    const res = await listAll(dirRef);
    return res.items.map((itemRef) => itemRef.fullPath);
}

export async function getFileDownloadURL(path: string): Promise<string> {
    const fileRef = ref(storage, path);
    return getDownloadURL(fileRef);
}

export async function fileExists(path: string): Promise<boolean> {
    const fileRef = ref(storage, path);
    try {
        await getDownloadURL(fileRef);
        return true;
    } catch (error: unknown) {
        if ((error as { code: string }).code === "storage/object-not-found") {
            return false;
        }
        throw error;
    }
}

export async function uploadFile(
    path: string,
    file: Blob | Uint8Array | ArrayBuffer,
    onProgress?: (progress: number) => void,
): Promise<string> {
    if (await fileExists(path)) {
        throw new Error("File already exists at this path.");
    }

    const fileRef = ref(storage, path);
    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                if (onProgress) {
                    const progress =
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                }
            },
            (error) => reject(error),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            },
        );
    });
}

export const uploadFiles = async (
    path: string,
    files: (Blob | Uint8Array | ArrayBuffer)[],
    onProgress?: (progress: number) => void,
) => {
    const uploadPromises = files.map((file) =>
        uploadFile(path, file, onProgress),
    );
    return Promise.all(uploadPromises);
};

export async function copyFile(sourcePath: string, destinationPath: string) {
    const sourceRef = ref(storage, sourcePath);
    const destRef = ref(storage, destinationPath);
    const url = await getDownloadURL(sourceRef);
    const response = await fetch(url);
    const blob = await response.blob();
    const newRef = await uploadBytes(destRef, blob);
    const downlpadURL = await getDownloadURL(newRef.ref);

    return downlpadURL;
}

export async function copyFiles(
    sourceDestPairs: { source: string; dest: string }[],
) {
    return await Promise.all(
        sourceDestPairs.map(({ source, dest }) => copyFile(source, dest)),
    );
}

export async function moveFile(sourcePath: string, destinationPath: string) {
    const url = await copyFile(sourcePath, destinationPath);
    await deleteFile(sourcePath);

    return url;
}

export async function moveFiles(
    sourceDestPairs: { source: string; dest: string }[],
) {
    return await Promise.all(
        sourceDestPairs.map(({ source, dest }) => moveFile(source, dest)),
    );
}

export async function deleteFile(path: string) {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
}

export async function deleteFiles(paths: string[]) {
    await Promise.all(paths.map(deleteFile));
}

export function getStoragePathFromUrl(url: string): string | null {
    try {
        const match = url.match(/\/o\/(.+?)\?/);
        if (!match?.[1]) return null;
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}

/**
 * Recursively deletes all files and folders under a given Firebase Storage path.
 * @param path The root path to delete.
 */
export async function deleteFolderRecursive(path: string): Promise<void> {
    const dirRef = ref(storage, path);
    const res = await listAll(dirRef);

    // Delete all files in this folder
    if (res.items.length > 0) {
        await Promise.all(res.items.map((itemRef) => deleteObject(itemRef)));
    }

    // Recursively delete all subfolders
    if (res.prefixes.length > 0) {
        await Promise.all(
            res.prefixes.map((subDirRef) =>
                deleteFolderRecursive(subDirRef.fullPath),
            ),
        );
    }
}
