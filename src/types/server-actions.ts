export type ServerActionResponse<T> = {
    error: false;
    data: T;
} | {
    error: true;
    message: string;
}