import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { H3 } from "@/components/ui/typography";
import { getOrders, getStatusCounts } from "@/features/orders/actions";
import { OrdersClient } from "@/features/orders/components/orders-client";
import { ServerTranslate } from "@/lib/i18n/ServerTranslate";

export default async function OrdersPage() {
    const { error, data: orders, message } = await getOrders();
    const response = await getStatusCounts();

    if (error || !orders || response.error) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <H3>
                    <ServerTranslate k="ordersTranslations.orders" />
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
                <ServerTranslate k="ordersTranslations.orders" />
            </H3>
            <OrdersClient
                orders={orders}
                statusCounts={response.data}
            />
        </div>
    );
}
