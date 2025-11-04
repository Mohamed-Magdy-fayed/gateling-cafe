import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { H3 } from "@/components/ui/typography";
import { getReservations, getStatusCounts } from "@/features/reservations/actions";
import { ReservationsClient } from "@/features/reservations/components/reservations-client";
import { ServerTranslate } from "@/lib/i18n/ServerTranslate";

export default async function ReservationsPage() {
    const response = await getReservations();
    const statusCounts = await getStatusCounts()

    if (response.error) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <H3>
                    <ServerTranslate k="reservationsTranslations.reservations" />
                </H3>
                <Alert>
                    <AlertTriangleIcon />
                    <AlertTitle>
                        <ServerTranslate k="error" />
                    </AlertTitle>
                    <AlertDescription>{response.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <H3>
                <ServerTranslate k="reservationsTranslations.reservations" />
            </H3>
            <ReservationsClient
                reservations={response.data}
                statusCounts={statusCounts}
            />
        </div>
    );
}
