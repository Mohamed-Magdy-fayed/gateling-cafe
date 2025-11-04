"use client";

import { SaveIcon, XIcon } from "lucide-react";
import { SelectField } from "@/components/general/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { type Order, orderStatuses } from "@/drizzle/schema";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { OrderItemsSection } from "./orders-form/order-items-section";
import { OrderSummarySection } from "./orders-form/order-summary-section";
import { useOrdersForm } from "./orders-form/use-order-form";

export type { OrderFormValues } from "./orders-form/schemas";

export function OrdersForm({
    order,
    setIsOpen,
}: {
    order?: Order;
    setIsOpen: (open: boolean) => void;
}) {
    const { t } = useTranslation();

    const {
        balanceDueCents,
        derivedOrderTotalCents,
        fields,
        form,
        handleAddItem,
        handleRemoveItem,
        handleSubmit,
        isSubmitting,
        products,
        totalPaidCents,
        watchedItems,
    } = useOrdersForm({ order, setIsOpen, t });

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex h-full flex-col"
            >
                <div className="flex flex-col gap-6 p-4 sm:p-6">
                    <div className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="orderNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("ordersTranslations.orderNumber")}</FormLabel>
                                    <FormControl>
                                        <Badge>{field.value}</Badge>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("ordersTranslations.status")}</FormLabel>
                                    <FormControl>
                                        <SelectField
                                            options={orderStatuses.map((status) => ({
                                                value: status,
                                                label: t("ordersTranslations.statusNames", {
                                                    statusName: status,
                                                }),
                                            }))}
                                            title={t("ordersTranslations.statuses")}
                                            values={field.value ? [field.value] : []}
                                            setValues={(vals) =>
                                                field.onChange(vals.length ? vals[0] : "")
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="customerName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("ordersTranslations.customerName")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t(
                                                "ordersTranslations.customerNamePlaceholder",
                                            )}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customerPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("ordersTranslations.customerPhone")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t(
                                                "ordersTranslations.customerPhonePlaceholder",
                                            )}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <OrderItemsSection
                        fields={fields}
                        form={form}
                        onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem}
                        products={products}
                        watchedItems={watchedItems}
                    />

                    <OrderSummarySection
                        balanceDueCents={balanceDueCents}
                        derivedOrderTotalCents={derivedOrderTotalCents}
                        form={form}
                        totalPaidCents={totalPaidCents}
                    />
                </div>

                <SheetFooter className="gap-2 border-t px-4 py-3 sm:px-6">
                    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                        >
                            <XIcon />
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="grow"
                        >
                            <SaveIcon className="mr-2 size-4" />
                            {t("common.save")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
