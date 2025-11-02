import type { User } from "@/drizzle/schema";

export function getRoleText(role: User["role"]) {
    switch (role) {
        case "admin":
            return "Admin";
        case "user":
            return "User";
        default:
            return role;
    }
}
