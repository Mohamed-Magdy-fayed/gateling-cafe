import { PlusIcon } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import type { Product } from "@/drizzle/schema";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FormProductCard } from "./form-product-card";
import type { OrderFormValues } from "./schemas";

interface OrderItemsSectionProps {
    fields: FieldArrayWithId<OrderFormValues, "items", "id">[];
    form: UseFormReturn<OrderFormValues>;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    products: Product[];
    watchedItems: OrderFormValues["items"];
}

export function OrderItemsSection({
    fields,
    form,
    onAddItem,
    onRemoveItem,
    products,
    watchedItems,
}: OrderItemsSectionProps) {
    const { t } = useTranslation();

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <FormLabel className="text-base font-semibold">
                        {t("ordersTranslations.orderItems")}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                        {t("ordersTranslations.orderItemsHelper")}
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onAddItem}
                    disabled={!products.length}
                >
                    <PlusIcon className="size-4" />
                    {t("ordersTranslations.addProduct")}
                </Button>
            </div>

            <div className="space-y-3">
                {fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {t("ordersTranslations.itemsEmpty")}
                    </div>
                ) : (
                    fields.map((fieldItem, index) => (
                        <FormProductCard
                            key={fieldItem.id}
                            fieldItem={fieldItem}
                            form={form}
                            index={index}
                            products={products}
                            watchedItems={watchedItems}
                            remove={onRemoveItem}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
