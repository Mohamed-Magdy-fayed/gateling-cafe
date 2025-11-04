import type { UseFormReturn } from "react-hook-form";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@/components/ui/number-input";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { OrderFormValues } from "./schemas";

interface OrderSummarySectionProps {
    balanceDueCents: number;
    derivedOrderTotalCents: number;
    form: UseFormReturn<OrderFormValues>;
    totalPaidCents: number;
}

export function OrderSummarySection({
    balanceDueCents,
    derivedOrderTotalCents,
    form,
    totalPaidCents,
}: OrderSummarySectionProps) {
    const { t } = useTranslation();

    return (
        <section className="space-y-4">
            <FormLabel className="text-base font-semibold">
                {t("ordersTranslations.orderSummary")}
            </FormLabel>
            <div className="flex flex-col gap-4">
                <div className="flex-1 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t("ordersTranslations.itemsSubtotal")}</span>
                        <span>{formatCurrency(derivedOrderTotalCents)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t("ordersTranslations.amountPaid")}</span>
                        <span>{formatCurrency(totalPaidCents || 0)}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-base font-semibold">
                        <span>{t("ordersTranslations.balanceDue")}</span>
                        <span>{formatCurrency(balanceDueCents || 0)}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name="totalPaid"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("ordersTranslations.totalPaid")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        ref={field.ref}
                                        name={field.name}
                                        onBlur={field.onBlur}
                                        value={field.value || null}
                                        min={0}
                                        placeholder={t("ordersTranslations.totalPaidPlaceholder")}
                                        onChange={(value) => field.onChange(value)}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t("ordersTranslations.totalPaidHelper")}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </section>
    );
}
