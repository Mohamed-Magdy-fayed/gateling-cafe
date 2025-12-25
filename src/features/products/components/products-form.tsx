"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

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
import { NumberInput } from "@/components/ui/number-input";
import { SheetFooter } from "@/components/ui/sheet";
import type { Product } from "@/drizzle/schema";
import { createProduct, editProducts } from "@/features/products/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";

const productFormSchema = z.object({
    name: z.string(),
    priceCents: z.number(),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductsForm({
    product,
    setIsOpen,
}: {
    product?: Product;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const { t } = useTranslation();
    const router = useRouter();

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: product?.name || "",
            priceCents: product?.priceCents || 0,
        },
    });

    async function handleSubmit(data: ProductFormValues) {
        let resultProduct: {
            error: boolean;
            message?: string;
            data?: Product | undefined;
        };

        if (!product) {
            resultProduct = await createProduct(data);
        } else {
            resultProduct = await editProducts({ ids: [product?.id], ...data });
        }

        if (resultProduct.error) {
            toast.error(t("error", { error: resultProduct.message }));
        } else {
            toast.success(t("success"));
            router.refresh();
            setIsOpen(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <SheetFooter>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("forms.name")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("forms.namePlaceholder")} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="priceCents"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("productsTranslations.price")}</FormLabel>
                                <FormControl>
                                    <NumberInput
                                        placeholder={t("productsTranslations.pricePlaceholder")}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center justify-between gap-4">
                        <Button
                            disabled={
                                !form.formState.isValid ||
                                form.formState.isSubmitting
                            }
                            className="flex-1"
                        >
                            <SaveIcon />
                            {t("common.save")}
                        </Button>
                        <Button type="button" variant="destructive">
                            {t("common.cancel")}
                        </Button>
                    </div>
                </SheetFooter>
            </form>
        </Form>
    );
}
