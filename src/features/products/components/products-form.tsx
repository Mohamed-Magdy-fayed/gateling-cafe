"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { SelectField } from "@/components/general/select-field";
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
import {
    type Product,
    productCategories,
    productStatuses,
    productTypes,
} from "@/drizzle/schema";
import { createProduct, editProducts } from "@/features/products/actions";
import { useTranslation } from "@/lib/i18n/useTranslation";
import FileDropzone, {
    type FileWithMetaData,
} from "@/services/firebase/file-dropzone";

const productFormSchema = z.object({
    name: z.string(),
    description: z.string(),
    priceCents: z.number(),
    images: z.string().array(),
    type: z.enum(productTypes),
    category: z.enum(productCategories),
    status: z.enum(productStatuses),
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

    const [uploading, setUploading] = useState(false);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: product?.name || "",
            description: product?.description || "",
            priceCents: product?.priceCents || 0,
            images: product?.images || [],
            category: product?.category,
            type: product?.type,
            status: product?.status,
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

    const handleFilesChange = useCallback(
        (files: FileWithMetaData[]) => {
            const downloadURLs = files
                .map((file) => file.downloadURL)
                .filter((url): url is string => typeof url === "string");
            form.setValue("images", downloadURLs, { shouldValidate: true });
        },
        [form],
    );

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
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("forms.description")}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("forms.descriptionPlaceholder")}
                                        {...field}
                                    />
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
                    <FormField
                        control={form.control}
                        name={"category"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("productsTranslations.category")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={productCategories.map((category) => ({
                                            value: category,
                                            label: t(`productsTranslations.categoryNames`, {
                                                categoryName: category,
                                            }),
                                        }))}
                                        title={t("productsTranslations.categories")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? null : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={"type"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("productsTranslations.type")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={productTypes.map((type) => ({
                                            value: type,
                                            label: t(`productsTranslations.typeNames`, {
                                                typeName: type,
                                            }),
                                        }))}
                                        title={t("productsTranslations.types")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? null : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={"status"}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("productsTranslations.status")}</FormLabel>
                                <FormControl>
                                    <SelectField
                                        options={productStatuses.map((status) => ({
                                            value: status,
                                            label: t(`productsTranslations.statusNames`, {
                                                statusName: status,
                                            }),
                                        }))}
                                        title={t("productsTranslations.statuses")}
                                        values={!field.value ? [] : [field.value]}
                                        setValues={(vals) =>
                                            field.onChange(vals.length === 0 ? null : vals[0])
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="images"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("productsTranslations.images")}</FormLabel>
                                <FormControl>
                                    <FileDropzone
                                        setUploading={setUploading}
                                        onFilesChange={handleFilesChange}
                                        initialUrls={field.value ?? []}
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
                                form.formState.isSubmitting ||
                                uploading
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
