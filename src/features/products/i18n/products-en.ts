import { dt, type LanguageMessages } from "@/lib/i18n/lib";

export default {
    productsTranslations: {
        name: "Name",
        product: "Product",
        products: "Products",
        price: "Price",
        pricePlaceholder: "Enter product price",
        category: "Category",
        categories: "Categories",
        categoryNames: dt("{categoryName:enum}", {
            enum: {
                categoryName: {
                    coffee: "Coffee",
                    tea: "Tea",
                    juice: "Juice",
                    smoothie: "Smoothie",
                    pastry: "Pastry",
                    dessert: "Dessert",
                    sandwich: "Sandwich",
                    salad: "Salad",
                    breakfast: "Breakfast",
                    snack: "Snack",
                    other: "Other",
                }
            }
        }),
        type: "Type",
        types: "Types",
        typeNames: dt("{typeName:enum}", {
            enum: {
                typeName: {
                    beverage: "Beverage",
                    food: "Food",
                    merchandise: "Merchandise",
                    addon: "Addon",
                }
            }
        }),
        status: "Status",
        statuses: "Statuses",
        statusNames: dt("{statusName:enum}", {
            enum: {
                statusName: {
                    active: "Active",
                    inactive: "Inactive",
                    archived: "Archived"
                }
            }
        }),
        images: "Images"
    },
} as const satisfies LanguageMessages;
