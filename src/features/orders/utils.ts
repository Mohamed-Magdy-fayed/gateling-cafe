export async function generateOrderNumber(todayCount: number): Promise<string> {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const count = String(todayCount + 1).padStart(3, "0"); // e.g., 001, 002

    return `OR-${year}${month}${day}-${count}`;
}
