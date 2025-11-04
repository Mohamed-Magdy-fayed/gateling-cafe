import { Trash2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { SelectField } from "@/components/general/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@/components/ui/number-input";
import type { Product } from "@/drizzle/schema";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { OrderFormValues } from "./schemas";

interface FormProductCardProps {
    fieldItem: OrderFormValues["items"][number];
    form: UseFormReturn<OrderFormValues>;
    index: number;
    products: Product[];
    remove: (index: number) => void;
    watchedItems: OrderFormValues["items"];
}

export function FormProductCard({
    fieldItem,
    form,
    index,
    products,
    remove,
    watchedItems,
}: FormProductCardProps) {
    const { t } = useTranslation();

    const productId = form.watch(`items.${index}.productId`);
    const qty = form.watch(`items.${index}.qty`);

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === productId),
        [productId, products],
    );
    const unitPriceDisplay = useMemo(
        () => selectedProduct?.priceCents ?? 0,
        [selectedProduct],
    );
    const qtyValue = useMemo(() => Math.max(1, Math.round(qty ?? 1)), [qty]);
    const lineTotalDisplay = useMemo(
        () => unitPriceDisplay * qtyValue,
        [unitPriceDisplay, qtyValue],
    );

    useEffect(() => {
        const itemsValues = form.getValues("items") ?? [];
        const currentItem = itemsValues[index];

        const currentUnitPrice = currentItem?.unitPriceCents ?? 0;
        if (currentUnitPrice !== unitPriceDisplay) {
            form.setValue(`items.${index}.unitPriceCents`, unitPriceDisplay, {
                shouldDirty: true,
            });
        }

        const currentLineTotal = currentItem?.lineTotalCents ?? 0;
        if (currentLineTotal !== lineTotalDisplay) {
            form.setValue(`items.${index}.lineTotalCents`, lineTotalDisplay, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [form, index, lineTotalDisplay, unitPriceDisplay]);

    const options = products.map((product) => ({
        value: product.id,
        label: product.name,
        isDisabled:
            watchedItems.some(
                (item, itemIndex) =>
                    itemIndex !== index && item?.productId === product.id,
            ) ?? false,
    }));

    return (
        <Card key={fieldItem.productId} className="border-muted/60">
            <CardHeader>
                <CardTitle>
                    {t("ordersTranslations.product")} #{index + 1}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.productId` as const}
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <SelectField
                                            options={options}
                                            title={t("ordersTranslations.selectProduct")}
                                            values={field.value ? [field.value] : []}
                                            setValues={(vals) =>
                                                field.onChange(vals.length ? vals[0] : "")
                                            }
                                            disabled={!products.length}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={index === 0}
                        aria-label={t("ordersTranslations.removeProduct")}
                    >
                        <Trash2Icon className="size-4" />
                    </Button>
                </div>

                <div className="grid gap-2">
                    <FormField
                        control={form.control}
                        name={`items.${index}.qty` as const}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("ordersTranslations.qty")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        ref={field.ref}
                                        name={field.name}
                                        onBlur={field.onBlur}
                                        min={1}
                                        value={field.value ?? qtyValue}
                                        onChange={(value) =>
                                            field.onChange(value == null ? 1 : Math.max(1, value))
                                        }
                                        className="h-9"
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t("ordersTranslations.qtyHelper")}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("ordersTranslations.unitPrice")}
                        </p>
                        <p className="text-lg font-semibold">
                            {formatCurrency(unitPriceDisplay)}
                        </p>
                    </div>
                    <div className="rounded-md border bg-primary/5 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("ordersTranslations.lineTotal")}
                        </p>
                        <p className="text-lg font-semibold">
                            {formatCurrency(lineTotalDisplay)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
