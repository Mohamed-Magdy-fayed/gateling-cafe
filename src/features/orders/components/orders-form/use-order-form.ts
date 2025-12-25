import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
    type UseFieldArrayReturn,
    type UseFormReturn,
    useFieldArray,
    useForm,
    useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { Order, Product } from "@/drizzle/schema";
import {
    createOrder,
    editOrders,
    generateOrderNumberAction,
    getOrderFormProducts,
    getOrderProducts,
} from "@/features/orders/actions";
import type { useTranslation } from "@/lib/i18n/useTranslation";
import type { ServerActionResponse } from "@/types/server-actions";
import {
    createEmptyItem,
    type OrderFormValues,
    orderFormSchema,
} from "./schemas";

type Translate = ReturnType<typeof useTranslation>["t"];

interface UseOrdersFormParams {
    order?: Order;
    setIsOpen: (open: boolean) => void;
    t: Translate;
}

type ItemsFieldArray = UseFieldArrayReturn<OrderFormValues, "items">;

interface UseOrdersFormReturn {
    balanceDueCents: number;
    derivedOrderTotalCents: number;
    fields: ItemsFieldArray["fields"];
    form: UseFormReturn<OrderFormValues>;
    handleAddItem: () => void;
    handleRemoveItem: (index: number) => void;
    handleSubmit: (values: OrderFormValues) => Promise<void>;
    isSubmitting: boolean;
    products: Product[];
    totalPaidCents: number;
    watchedItems: OrderFormValues["items"];
}

export function useOrdersForm({
    order,
    setIsOpen,
    t,
}: UseOrdersFormParams): UseOrdersFormReturn {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [isPending, startTransition] = useTransition();

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderFormSchema),
        defaultValues: {
            orderNumber: order?.orderNumber ?? "",
            status: order?.status ?? "created",
            orderTotal: order?.orderTotal,
            totalPaid: order?.totalPaid,
            items: order ? [] : [createEmptyItem()],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const orderId = order?.id;
    const watchedItems = useWatch({ control: form.control, name: "items" }) ?? [];

    const productsById = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    );

    const watchedTotalPaid =
        useWatch({ control: form.control, name: "totalPaid" });

    const derivedOrderTotalCents = useMemo(
        () =>
            watchedItems.reduce((sum, item) => {
                if (!item) {
                    return sum;
                }

                const product = item.productId
                    ? productsById.get(item.productId)
                    : undefined;
                const qty = Math.max(1, Math.round(item.qty ?? 1));
                const unitPrice =
                    item.unitPriceCents && item.unitPriceCents > 0
                        ? item.unitPriceCents
                        : (product?.priceCents ?? 0);

                const lineTotal =
                    item.lineTotalCents && item.lineTotalCents > 0
                        ? item.lineTotalCents
                        : unitPrice * qty;

                return sum + lineTotal;
            }, 0),
        [productsById, watchedItems],
    );

    const totalPaidCents = useMemo(
        () => Math.min(!watchedTotalPaid ? 0 : watchedTotalPaid, derivedOrderTotalCents),
        [derivedOrderTotalCents, watchedTotalPaid],
    );
    const balanceDueCents = useMemo(
        () => Math.max(derivedOrderTotalCents - totalPaidCents, 0),
        [derivedOrderTotalCents, totalPaidCents],
    );

    const handleAddItem = () => {
        append(createEmptyItem());
    };

    const handleSubmit = async (values: OrderFormValues) => {
        const normalizedItems = values.items.map((item) => {
            const product = productsById.get(item.productId);
            const qty = Math.max(1, Math.round(item.qty));
            const unitPriceCents = product?.priceCents ?? item.unitPriceCents ?? 0;
            const lineTotalCents = unitPriceCents * qty;

            return {
                ...item,
                qty,
                unitPriceCents,
                lineTotalCents,
            };
        });

        const computedOrderTotal = normalizedItems.reduce(
            (sum, item) => sum + item.lineTotalCents,
            0,
        );

        const normalizedTotalPaid = Math.max(
            0,
            Math.min(values.totalPaid ?? 0, computedOrderTotal),
        );

        const payload: OrderFormValues = {
            ...values,
            items: normalizedItems,
            orderTotal: computedOrderTotal,
            totalPaid: normalizedTotalPaid,
        };

        let response: ServerActionResponse<Order | Order[]>;

        if (order) {
            response = await editOrders({ ids: [order.id], ...payload });
        } else {
            response = await createOrder(payload);
        }

        if (response.error) {
            toast.error(t("error", { error: response.message ?? "" }));
            return;
        }

        toast.success(t("success"));
        router.refresh();
        setIsOpen(false);
    };

    useEffect(() => {
        if (order) return;

        let cancelled = false;

        startTransition(async () => {
            const currentNumber = form.getValues("orderNumber");
            if (currentNumber) return;

            const generatedNumber = await generateOrderNumberAction();
            if (!cancelled) {
                form.setValue("orderNumber", generatedNumber);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [form, order, startTransition]);

    useEffect(() => {
        let cancelled = false;

        startTransition(async () => {
            const productsResponse = await getOrderFormProducts();

            if (cancelled) {
                return;
            }

            if (productsResponse.error) {
                toast.error(t("error", { error: productsResponse.message ?? "" }));
                setProducts([]);
                replace([createEmptyItem()]);
                return;
            }

            const fetchedProducts = productsResponse.data ?? [];
            setProducts(fetchedProducts);

            if (!orderId) {
                replace([createEmptyItem()]);
                return;
            }

            const orderProductsResponse = await getOrderProducts(orderId);

            if (cancelled) {
                return;
            }

            if (orderProductsResponse.error) {
                toast.error(t("error", { error: orderProductsResponse.message ?? "" }));
                replace([createEmptyItem()]);
                return;
            }

            const existingItems = orderProductsResponse.data ?? [];

            if (!existingItems.length) {
                replace([createEmptyItem()]);
                return;
            }

            replace(
                existingItems.map((item) => ({
                    productId: item.productId,
                    qty: item.qty,
                    unitPriceCents: item.unitPriceCents ?? 0,
                    lineTotalCents: item.lineTotalCents ?? 0,
                })),
            );
        });

        return () => {
            cancelled = true;
        };
    }, [orderId, replace, startTransition, t]);

    useEffect(() => {
        let cancelled = false;
        if (order) { cancelled = true; return; }

        if (cancelled) return;

        watchedItems.forEach((item, index) => {
            if (!item) {
                return;
            }

            const product = item.productId
                ? productsById.get(item.productId)
                : undefined;

            const safeQty = Math.max(1, Math.round(item.qty ?? 1));
            if (item.qty !== safeQty) {
                form.setValue(`items.${index}.qty`, safeQty, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }

            const unitPriceCents = product?.priceCents ?? 0;
            if (item.unitPriceCents !== unitPriceCents) {
                form.setValue(`items.${index}.unitPriceCents`, unitPriceCents, {
                    shouldDirty: true,
                });
            }

            const lineTotalCents = unitPriceCents * safeQty;
            if (item.lineTotalCents !== lineTotalCents) {
                form.setValue(`items.${index}.lineTotalCents`, lineTotalCents, {
                    shouldDirty: true,
                });
            }
        });

        const currentOrderTotal = form.getValues("orderTotal") ?? 0;
        if (currentOrderTotal !== derivedOrderTotalCents) {
            form.setValue("orderTotal", derivedOrderTotalCents, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }

        const currentTotalPaid = form.getValues("totalPaid");
        console.log(totalPaidCents);

        if ((currentTotalPaid !== totalPaidCents) && totalPaidCents !== 0 && totalPaidCents != null) {
            form.setValue("totalPaid", totalPaidCents, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [
        derivedOrderTotalCents,
        form,
        productsById,
        totalPaidCents,
        watchedItems,
    ]);

    const isSubmitting = isPending || form.formState.isSubmitting;

    return {
        balanceDueCents,
        derivedOrderTotalCents,
        fields,
        form,
        handleAddItem,
        handleRemoveItem: remove,
        handleSubmit,
        isSubmitting,
        products,
        totalPaidCents,
        watchedItems,
    };
}
