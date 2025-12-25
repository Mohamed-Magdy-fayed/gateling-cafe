import { AlertTriangleIcon } from "lucide-react";
import { hasPermission } from "@/auth/core/permissions";
import { getCurrentUser } from "@/auth/nextjs/get-current-user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { H3 } from "@/components/ui/typography";
import {
    getReservations,
    getStatusCounts,
} from "@/features/reservations/actions";
import { ReservationsClient } from "@/features/reservations/components/reservations-client";
import { ServerTranslate } from "@/lib/i18n/ServerTranslate";

export default async function ReservationsPage() {
    const response = await getReservations();
    const statusCounts = await getStatusCounts();
    const user = await getCurrentUser();
    const canManageAnnouncements = user
        ? hasPermission(user, "reservations", "update")
        : false;

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
                canManageAnnouncements={canManageAnnouncements}
            />
        </div>
    );
}
