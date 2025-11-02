"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { SelectField } from "@/components/general/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { SheetFooter } from "@/components/ui/sheet";
import { type Order, orderStatuses, type Product } from "@/drizzle/schema";
import {
    createOrder,
    editOrders,
    generateOrderNumberAction,
    getOrderFormProducts,
    getOrderProducts,
} from "@/features/orders/actions";
import { formatCurrency } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { ServerActionResponse } from "@/types/server-actions";

const orderProductSchema = z.object({
    qty: z.number().min(1),
    productId: z.string().min(1),
});

const orderFormSchema = z.object({
    orderNumber: z.string(),
    status: z.enum(orderStatuses),
    orderTotal: z.number(),
    totalPaid: z.number(),
    customerName: z.string(),
    customerPhone: z.string(),
    items: z.array(orderProductSchema).min(1),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export function OrdersForm({
    order,
    setIsOpen,
}: {
    order?: Order;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const { t } = useTranslation();
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [isPending, startTransition] = useTransition();

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderFormSchema),
        defaultValues: {
            customerName: order?.customerName || "",
            customerPhone: order?.customerPhone || "",
            orderNumber: order?.orderNumber || "",
            status: order?.status || "created",
            orderTotal: order?.orderTotal ?? 0,
            totalPaid: order?.totalPaid ?? 0,
            items: order ? [] : [{ productId: "", qty: 1 }],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const orderId = order?.id;

    const watchedItems = form.watch("items");

    const productOptions = useMemo(
        () =>
            products
                .filter((p) => !watchedItems.some((item) => item.productId === p.id))
                .map((product) => ({
                    value: product.id,
                    label: `${product.name} - ${formatCurrency(product.priceCents)}`,
                })),
        [products],
    );

    async function handleSubmit(data: OrderFormValues) {
        let response: ServerActionResponse<Order | Order[]>;

        if (!order) {
            response = await createOrder(data);
        } else {
            response = await editOrders({ ids: [order.id], ...data });
        }

        if (response.error) {
            toast.error(t("error", { error: response.message }));
        } else {
            toast.success(t("success"));
            router.refresh();
            setIsOpen(false);
        }
    }

    useEffect(() => {
        if (order) return;

        let cancelled = false;

        startTransition(async () => {
            const currentNumber = form.getValues("orderNumber");
            if (currentNumber) return;

            const orderNumber = await generateOrderNumberAction();

            if (!cancelled) {
                form.setValue("orderNumber", orderNumber);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [order]);

    useEffect(() => {
        let cancelled = false;

        startTransition(async () => {
            const productsResponse = await getOrderFormProducts();

            if (cancelled) return;

            if (productsResponse.error) {
                toast.error(t("error", { error: productsResponse.message ?? "" }));
                replace([{ productId: "", qty: 1 }]);
                return;
            }

            setProducts(productsResponse.data ?? []);

            if (orderId) {
                const orderProductsResponse = await getOrderProducts(orderId);

                if (cancelled) return;

                if (orderProductsResponse.error) {
                    toast.error(
                        t("error", { error: orderProductsResponse.message ?? "" }),
                    );
                    replace([{ productId: "", qty: 1 }]);
                    return;
                }

                const existingItems = orderProductsResponse.data ?? [];

                if (existingItems.length === 0) {
                    replace([{ productId: "", qty: 1 }]);
                    return;
                }

                replace(
                    existingItems.map(({ productId, qty }) => ({ productId, qty })),
                );
            } else {
                replace([{ productId: "", qty: 1 }]);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [orderId]);

    useEffect(() => {
        const total = (watchedItems ?? []).reduce((sum, item) => {
            const product = products.find((prod) => prod.id === item.productId);
            return product ? sum + product.priceCents : sum;
        }, 0);

        if (form.getValues("orderTotal") !== total) {
            form.setValue("orderTotal", total, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
        const currentTotalPaid = form.getValues("totalPaid");
        if (typeof currentTotalPaid === "number" && currentTotalPaid > total) {
            form.setValue("totalPaid", total, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [watchedItems]);

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex h-full flex-col"
            >
                <div className="flex flex-col gap-4 p-4">
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
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <FormLabel>{t("ordersTranslations.orderItems")}</FormLabel>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => append({ productId: "", qty: 1 })}
                                disabled={!products.length}
                            >
                                <PlusIcon className="size-4" />
                                {t("ordersTranslations.addProduct")}
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {fields.map((fieldItem, index) => (
                                <div key={fieldItem.id} className="flex items-end gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.productId` as const}
                                        render={({ field }) => (
                                            <FormItem className="flex-1 truncate">
                                                <FormLabel>
                                                    {t("ordersTranslations.product")} #{index + 1}
                                                </FormLabel>
                                                <FormControl>
                                                    <SelectField
                                                        options={productOptions}
                                                        title={t("ordersTranslations.selectProduct")}
                                                        values={field.value ? [field.value] : []}
                                                        setValues={(vals) =>
                                                            field.onChange(vals.length === 0 ? "" : vals[0])
                                                        }
                                                        disabled={!products.length}
                                                    />

                                                </FormControl>
                                                <FormMessage />
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    className="h-8"
                                                    value={form.getValues(`items.${index}.qty`)}
                                                    onChange={(e) =>
                                                        form.setValue(`items.${index}.qty`, Number(e.target.value))
                                                    }
                                                />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1}
                                        aria-label={t("ordersTranslations.removeProduct")}
                                    >
                                        <Trash2Icon className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <FormField
                        control={form.control}
                        name="orderTotal"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("ordersTranslations.orderTotal")}</FormLabel>
                                <FormControl>
                                    <Badge>{formatCurrency(field.value || 0)}</Badge>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="totalPaid"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("ordersTranslations.totalPaid")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t("ordersTranslations.totalPaidPlaceholder")}
                                        {...field}
                                    />
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
                                            label: t(`ordersTranslations.statusNames`, {
                                                statusName: status,
                                            }),
                                        }))}
                                        title={t("ordersTranslations.statuses")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? "" : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <SheetFooter>
                    <div className="flex items-center justify-between gap-4">
                        <Button
                            disabled={
                                !form.formState.isValid ||
                                form.formState.isSubmitting ||
                                isPending
                            }
                            className="flex-1"
                        >
                            <SaveIcon className="size-4" />
                            {t("common.save")}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setIsOpen(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
