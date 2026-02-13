"use client";

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/drizzle/schema";
import { ensureQzSecurity, printWithQz } from "@/features/orders/printing/print";

const STORAGE_KEY = "qz.printerName";

type PrinterStatus = "idle" | "connecting" | "ready" | "error";

interface PrinterContextValue {
    status: PrinterStatus;
    printers: string[];
    selectedPrinter: string | null;
    isConfigOpen: boolean;
    needsSetup: boolean;
    openConfig: () => void;
    closeConfig: () => void;
    refreshPrinters: () => Promise<void>;
    selectPrinter: (printer: string) => Promise<void>;
    printReceipt: (order: Order, appName: string) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

export function usePrinter(): PrinterContextValue {
    const ctx = useContext(PrinterContext);
    if (!ctx) {
        throw new Error("usePrinter must be used within PrinterProvider");
    }
    return ctx;
}

export function PrinterProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<PrinterStatus>("idle");
    const [printers, setPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
    const qzRef = useRef<any | null>(null);
    const qzSecurityInitializedRef = useRef(false);
    const connectPromiseRef = useRef<Promise<any> | null>(null);

    const needsSetup = !selectedPrinter;

    useEffect(() => {
        if (typeof document !== "undefined") {
            setDirection(document.documentElement.dir === "rtl" ? "rtl" : "ltr");
        }
    }, []);

    const loadSavedPrinter = useCallback(() => {
        if (typeof window === "undefined") return null;
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setSelectedPrinter(stored);
        }
        return stored;
    }, []);

    const loadQz = useCallback(async () => {
        if (qzRef.current) return qzRef.current;
        const mod = await import("qz-tray");
        const qz = mod.default ?? mod;
        qzRef.current = qz;
        return qz;
    }, []);

    const ensureSocket = useCallback(async () => {
        if (connectPromiseRef.current) {
            return connectPromiseRef.current;
        }

        const promise = (async () => {
            setStatus((prev) => (prev === "ready" ? prev : "connecting"));
            const qz = await loadQz();
            await ensureQzSecurity(qz, qzSecurityInitializedRef);

            try {
                if (!qz?.websocket?.isActive?.()) {
                    await qz.websocket.connect();
                    // small wait for isActive to flip
                    for (let i = 0; i < 5 && !qz.websocket.isActive?.(); i++) {
                        await new Promise((r) => setTimeout(r, 150));
                    }
                }

                if (!qz?.websocket?.isActive?.()) {
                    throw new Error("QZ websocket inactive after connect");
                }

                setStatus("ready");
            } catch (err) {
                console.error("QZ connect failed", err);
                setStatus("error");
                throw err;
            }

            return qz;
        })();

        connectPromiseRef.current = promise;
        promise.finally(() => {
            connectPromiseRef.current = null;
        });

        return promise;
    }, [loadQz]);

    const refreshPrinters = useCallback(async () => {
        try {
            const qz = await ensureSocket();
            const candidates: Array<() => Promise<string[] | undefined>> = [];

            if (typeof qz.getPrinters === "function") {
                candidates.push(() => qz.getPrinters());
            }
            if (qz.api && typeof qz.api.getPrinters === "function") {
                candidates.push(() => qz.api.getPrinters());
            }
            if (qz.printers && typeof qz.printers.find === "function") {
                candidates.push(() => qz.printers.find());
            }
            if (qz.printers && typeof qz.printers.list === "function") {
                candidates.push(() => qz.printers.list());
            }

            let list: string[] = [];
            for (const fn of candidates) {
                try {
                    const result = await fn();
                    if (Array.isArray(result) && result.length) {
                        list = result;
                        break;
                    }
                } catch (err) {
                    console.error("Failed to list printers via candidate", err);
                }
            }

            if (!list.length) {
                console.warn("QZ returned no printers. Ensure virtual/OS printers are available and QZ has permissions.");
            }

            setPrinters(list);
            if (!selectedPrinter && list.length > 0) {
                setIsConfigOpen(true);
            }
            if (selectedPrinter) {
                setIsConfigOpen(false);
            }
        } catch (err) {
            setStatus("error");
            setIsConfigOpen(true);
            toast.error(
                direction === "rtl"
                    ? "تعذر الاتصال بخدمة الطباعة"
                    : "Unable to connect to printer service",
            );
            console.error(err);
        }
    }, [direction, ensureSocket, selectedPrinter]);

    const selectPrinter = useCallback(
        async (printer: string) => {
            setSelectedPrinter(printer);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEY, printer);
            }
            setIsConfigOpen(false);
            await ensureSocket();
        },
        [ensureSocket],
    );

    const printReceipt = useCallback(
        async (order: Order, appName: string) => {
            const printer = selectedPrinter ?? loadSavedPrinter();
            if (!printer) {
                setIsConfigOpen(true);
                toast.error(
                    direction === "rtl"
                        ? "يرجى إعداد الطابعة قبل الطباعة."
                        : "Please configure a printer before printing.",
                );
                return;
            }

            try {
                const qz = await ensureSocket();
                await printWithQz({ qz, order, printerName: printer, appName });
            } catch (err) {
                setStatus("error");
                setIsConfigOpen(true);
                console.error(err);
                toast.error(
                    direction === "rtl"
                        ? "فشلت الطباعة. يرجى فحص اتصال QZ Tray."
                        : "Printing failed. Check QZ Tray connection.",
                );
            }
        },
        [direction, ensureSocket, loadSavedPrinter, selectedPrinter],
    );

    useEffect(() => {
        const stored = loadSavedPrinter();
        if (!stored) {
            setIsConfigOpen(true);
            void refreshPrinters();
            return;
        }

        void ensureSocket();
    }, [ensureSocket, loadSavedPrinter, refreshPrinters]);

    const value = useMemo<PrinterContextValue>(
        () => ({
            status,
            printers,
            selectedPrinter,
            isConfigOpen,
            needsSetup,
            openConfig: () => setIsConfigOpen(true),
            closeConfig: () => setIsConfigOpen(false),
            refreshPrinters,
            selectPrinter,
            printReceipt,
        }),
        [isConfigOpen, needsSetup, printReceipt, printers, refreshPrinters, selectPrinter, selectedPrinter, status],
    );

    return (
        <PrinterContext.Provider value={value}>
            {children}
            <PrinterConfigDialog
                open={isConfigOpen}
                onOpenChange={setIsConfigOpen}
                printers={printers}
                selectedPrinter={selectedPrinter}
                onRefresh={refreshPrinters}
                onSelect={selectPrinter}
                status={status}
                direction={direction}
            />
        </PrinterContext.Provider>
    );
}

interface PrinterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    printers: string[];
    selectedPrinter: string | null;
    onSelect: (printer: string) => Promise<void>;
    onRefresh: () => Promise<void>;
    status: PrinterStatus;
    direction: "ltr" | "rtl";
}

function PrinterConfigDialog({
    open,
    onOpenChange,
    printers,
    selectedPrinter,
    onSelect,
    onRefresh,
    status,
    direction,
}: PrinterDialogProps) {
    const isLoading = status === "connecting" && printers.length === 0;
    const labels = direction === "rtl"
        ? {
            title: "طابعة الإيصالات",
            desc: "اختر طابعة لتفعيل الطباعة التلقائية للإيصالات.",
            info: "لم نعثر على طابعة محفوظة. اختر واحدة وسيتم حفظها للاستخدام القادم.",
            refresh: status === "connecting" ? "جاري التحقق من الطابعات..." : "تحديث القائمة",
            current: "الحالية:",
            loading: "جاري تحميل الطابعات...",
            empty: "لا توجد طابعات. تأكد أن QZ Tray يعمل.",
        }
        : {
            title: "Receipt printer",
            desc: "Select a printer to enable automatic receipt printing.",
            info: "We could not find a saved printer. Choose one below and we will remember it for next time.",
            refresh: status === "connecting" ? "Checking printers..." : "Refresh",
            current: "Current:",
            loading: "Loading printers...",
            empty: "No printers found. Ensure QZ Tray is running.",
        };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{labels.title}</DialogTitle>
                    <DialogDescription>{labels.desc}</DialogDescription>
                </DialogHeader>

                <div className={`flex flex-col gap-4 ${direction === "rtl" ? "text-right" : "text-left"}`}>
                    <div className="text-sm text-muted-foreground">{labels.info}</div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={onRefresh}
                            disabled={status === "connecting"}
                        >
                            {labels.refresh}
                        </Button>
                        {selectedPrinter ? (
                            <span className="text-sm text-muted-foreground">
                                {labels.current} <strong>{selectedPrinter}</strong>
                            </span>
                        ) : null}
                    </div>

                    <Separator />

                    <ScrollArea className="max-h-64 rounded border p-3">
                        {isLoading ? (
                            <div className="text-sm text-muted-foreground">{labels.loading}</div>
                        ) : printers.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{labels.empty}</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {printers.map((printer) => (
                                    <Button
                                        key={printer}
                                        variant={
                                            printer === selectedPrinter ? "default" : "outline"
                                        }
                                        className="justify-start"
                                        onClick={() => onSelect(printer)}
                                    >
                                        {printer}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
