export function getTypeLabel(type: string): string {
    switch (type) {
        case "beverage":
            return "Beverage";
        case "food":
            return "Food";
        case "snack":
            return "Snack";
        default:
            return "Unknown";
    }
}

export function getCategoryLabel(type: string): string {
    switch (type) {
        case "coffee":
            return "Coffee";
        case "tea":
            return "Tea";
        case "juice":
            return "Juice";
        case "smoothie":
            return "Smoothie";
        case "pastry":
            return "Pastry";
        case "dessert":
            return "Dessert";
        case "sandwich":
            return "Sandwich";
        case "salad":
            return "Salad";
        case "breakfast":
            return "Breakfast";
        case "snack":
            return "Snack";
        case "other":
            return "Other";
        default:
            return "Unknown";
    }
}

export function getStatusLabel(type: string): string {
    switch (type) {
        case "active":
            return "Active";
        case "inactive":
            return "Inactive";
        case "archived":
            return "Archived";
        default:
            return "Unknown";
    }
}
