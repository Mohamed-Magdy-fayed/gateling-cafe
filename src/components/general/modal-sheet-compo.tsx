import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ModalSheetComponent({ isOpen, onOpenChange, title, description, content, confirmButton }: {
    isOpen: boolean;
    onOpenChange: (val: boolean) => void;
    title?: string;
    description?: string;
    content?: React.ReactNode;
    confirmButton?: React.ReactNode;
}) {
    const { t } = useTranslation();
    const isMobile = useIsMobile();

    if (!isMobile) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    <div className="m-2">{content}</div>
                    <DialogFooter>
                        {confirmButton}
                        <Button variant="destructive" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-4 overflow-auto h-screen">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>
                <div className="flex-1">{content}</div>
                <SheetFooter>
                    {confirmButton}
                    <Button variant="destructive" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}