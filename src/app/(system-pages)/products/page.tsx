import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { H3 } from "@/components/ui/typography";
import { getCategoryCounts, getProducts, getStatusCounts, getTypeCounts } from "@/features/products/actions";
import { ProductsClient } from "@/features/products/components/products-client";
import { ServerTranslate } from "@/lib/i18n/ServerTranslate";

export default async function ProductsPage() {
    const { error, data: products, message } = await getProducts();
    const [statusCounts, typeCounts, categoryCounts] = await Promise.all([
        getStatusCounts(),
        getTypeCounts(),
        getCategoryCounts(),
    ])

    if (error || !products) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <H3>
                    <ServerTranslate k="productsTranslations.products" />
                </H3>
                <Alert>
                    <AlertTriangleIcon />
                    <AlertTitle>
                        <ServerTranslate k="error" />
                    </AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <H3>
                <ServerTranslate k="productsTranslations.products" />
            </H3>
            <ProductsClient
                products={products}
                statusCounts={statusCounts}
                typesCounts={typeCounts}
                categoriesCounts={categoryCounts}
            />
        </div>
    );
}
