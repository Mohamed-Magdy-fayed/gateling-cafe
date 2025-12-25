"use client";

import * as React from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    getActiveKidsInAreaAction,
    getKidsAreaCalloutPhrasesAction,
    getKidsAreaCalloutTTSUrlAction,
    saveKidsAreaCalloutPhrasesAction,
} from "@/features/kids-area-callouts/actions";
import type {
    ActiveKidInArea,
    KidsAreaCalloutPhraseDTO,
} from "@/features/kids-area-callouts/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

function normalizeCalledText(text: string) {
    return text
        .replace(/\s+/g, " ")
        .replace(/\s+,/g, ",")
        .replace(/,\s*,/g, ",")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .trim();
}

function renderTemplate(template: string, kidName?: string | null) {
    const replaced = template.replaceAll(
        "{name}",
        kidName?.trim() ? kidName.trim() : "",
    );
    return normalizeCalledText(replaced);
}

const NAME_TOKEN = "{name}";

function formatTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function KidsAreaCalloutsClient() {
    const { t, locale } = useTranslation();
    const [search, setSearch] = React.useState("");
    const [selectedReservationId, setSelectedReservationId] = React.useState<
        string | null
    >(null);
    const [editMode, setEditMode] = React.useState(false);

    const [kids, setKids] = React.useState<ActiveKidInArea[]>([]);
    const [phrases, setPhrases] = React.useState<KidsAreaCalloutPhraseDTO[]>([]);
    const [draftPhrases, setDraftPhrases] = React.useState<
        Array<{ id?: string; template: string }>
    >([]);

    const [lastCall, setLastCall] = React.useState<{
        text: string;
        at: Date;
    } | null>(null);
    const [copyState, setCopyState] = React.useState<
        "idle" | "copied" | "failed"
    >("idle");
    const [isSaving, startSaving] = React.useTransition();

    const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

    const selectedKid = React.useMemo(
        () => kids.find((k) => k.reservationId === selectedReservationId) ?? null,
        [kids, selectedReservationId],
    );

    const filteredKids = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return kids;
        return kids.filter((k) => {
            const name = (k.kidName ?? "").toLowerCase();
            return name.includes(q) || k.reservationCode.toLowerCase().includes(q);
        });
    }, [kids, search]);

    const refreshKids = React.useCallback(async () => {
        const res = await getActiveKidsInAreaAction();
        if (!res.error) {
            setKids(res.data);
            // If selection is no longer active, clear it.
            setSelectedReservationId((prev) =>
                prev && res.data.some((k) => k.reservationId === prev) ? prev : null,
            );
        }
    }, []);

    const refreshPhrases = React.useCallback(async () => {
        const res = await getKidsAreaCalloutPhrasesAction();
        if (!res.error) {
            setPhrases(res.data);
            setDraftPhrases(
                res.data.map((p) => ({ id: p.id, template: p.template })),
            );
        }
    }, []);

    React.useEffect(() => {
        refreshKids();
        refreshPhrases();

        const id = window.setInterval(() => {
            refreshKids();
        }, 15_000);

        return () => window.clearInterval(id);
    }, [refreshKids, refreshPhrases]);

    async function copyText(text: string) {
        setCopyState("idle");
        try {
            await navigator.clipboard.writeText(text);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }
        window.setTimeout(() => setCopyState("idle"), 1200);
    }

    async function speak(text: string) {
        const trimmed = text.trim();
        if (!trimmed || typeof window === "undefined") {
            return;
        }

        try {
            const response = await getKidsAreaCalloutTTSUrlAction({
                text: trimmed,
                locale: locale === "ar" ? "ar" : "en",
            });

            if (response.error) {
                toast.error(response.message ?? t("errors.messageFailed"));
                return;
            }

            const url = response.data?.url;
            if (!url) {
                return;
            }

            if (activeAudioRef.current) {
                activeAudioRef.current.pause();
                activeAudioRef.current.currentTime = 0;
                activeAudioRef.current = null;
            }

            const audio = new Audio(url);
            activeAudioRef.current = audio;

            audio.addEventListener(
                "ended",
                () => {
                    if (activeAudioRef.current === audio) {
                        activeAudioRef.current = null;
                    }
                },
                { once: true },
            );
            audio.addEventListener(
                "error",
                () => {
                    if (activeAudioRef.current === audio) {
                        activeAudioRef.current = null;
                    }
                    toast.error(t("errors.messageFailed"));
                },
                { once: true },
            );

            await audio.play();
        } catch {
            toast.error(t("errors.messageFailed"));
        }
    }

    function callPhrase(template: string) {
        const rendered = renderTemplate(template, selectedKid?.kidName);
        setLastCall({ text: rendered, at: new Date() });
        setCopyState("idle");
        void speak(rendered);
    }

    function addDraftPhrase() {
        setDraftPhrases((prev) => [
            ...prev,
            {
                template: `${NAME_TOKEN}${t(
                    "kidsAreaCalloutsTranslations.defaultNewPhraseTail",
                )}`,
            },
        ]);
    }

    function deleteDraftPhrase(index: number) {
        setDraftPhrases((prev) => prev.filter((_, i) => i !== index));
    }

    function saveDraft() {
        startSaving(async () => {
            const res = await saveKidsAreaCalloutPhrasesAction({
                phrases: draftPhrases,
            });
            if (!res.error) {
                await refreshPhrases();
                setEditMode(false);
            }
        });
    }

    function discardDraft() {
        setDraftPhrases(phrases.map((p) => ({ id: p.id, template: p.template })));
    }

    const phraseList = editMode
        ? draftPhrases
        : phrases.map((p) => ({ id: p.id, template: p.template }));

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold">
                        {t("kidsAreaCalloutsTranslations.title")}
                    </h1>
                    <div className="flex items-center gap-2">
                        {editMode ? (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={discardDraft}
                                    disabled={isSaving}
                                >
                                    {t("kidsAreaCalloutsTranslations.discard")}
                                </Button>
                                <Button onClick={saveDraft} disabled={isSaving}>
                                    {isSaving ? t("common.saving") : t("common.save")}
                                </Button>
                            </>
                        ) : (
                            <Button variant="secondary" onClick={() => setEditMode(true)}>
                                {t("kidsAreaCalloutsTranslations.editPhrases")}
                            </Button>
                        )}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    {t("kidsAreaCalloutsTranslations.description")}
                </p>
            </div>

            {lastCall ? (
                <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            {t("kidsAreaCalloutsTranslations.nowCalling")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="rounded-md bg-muted p-4">
                            <div className="text-lg font-semibold leading-relaxed">
                                {lastCall.text}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {selectedKid?.kidName?.trim()
                                    ? `${t("kidsAreaCalloutsTranslations.kidLabel")}: ${selectedKid.kidName}`
                                    : selectedKid
                                        ? `${t("kidsAreaCalloutsTranslations.kidLabel")}: ${t("kidsAreaCalloutsTranslations.kidNoName")}`
                                        : `${t("kidsAreaCalloutsTranslations.kidLabel")}: ${t("kidsAreaCalloutsTranslations.kidNoneSelected")}`}{" "}
                                · {lastCall.at.toLocaleTimeString()}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => copyText(lastCall.text)}>
                                {copyState === "copied"
                                    ? t("kidsAreaCalloutsTranslations.copied")
                                    : copyState === "failed"
                                        ? t("kidsAreaCalloutsTranslations.copyFailed")
                                        : t("kidsAreaCalloutsTranslations.copy")}
                            </Button>
                            <Button variant="secondary" onClick={() => setLastCall(null)}>
                                {t("kidsAreaCalloutsTranslations.dismiss")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            {t("kidsAreaCalloutsTranslations.activeKidsInArea")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t(
                                    "kidsAreaCalloutsTranslations.searchPlaceholder",
                                )}
                            />
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground">
                                    {t("kidsAreaCalloutsTranslations.activeCount", {
                                        count: filteredKids.length,
                                    })}
                                </div>
                                <Button
                                    variant="ghost"
                                    className="h-8 px-2"
                                    onClick={() => setSelectedReservationId(null)}
                                    disabled={!selectedReservationId}
                                >
                                    {t("kidsAreaCalloutsTranslations.clearSelection")}
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {filteredKids.length === 0 ? (
                            <div className="py-6 text-sm text-muted-foreground">
                                {t("kidsAreaCalloutsTranslations.noActiveKids")}
                            </div>
                        ) : (
                            <ScrollArea className="h-[360px] pr-3">
                                <div className="flex flex-col gap-2">
                                    {filteredKids.map((kid) => {
                                        const selected =
                                            kid.reservationId === selectedReservationId;
                                        const displayName = kid.kidName?.trim()
                                            ? kid.kidName.trim()
                                            : t("kidsAreaCalloutsTranslations.noName");
                                        return (
                                            <div
                                                key={kid.reservationId}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setSelectedReservationId(kid.reservationId)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        setSelectedReservationId(kid.reservationId);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex w-full cursor-pointer flex-col gap-1 rounded-md border p-3 text-left transition outline-none",
                                                    selected
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div
                                                        className={cn(
                                                            "font-medium",
                                                            !kid.kidName?.trim() && "text-muted-foreground",
                                                        )}
                                                    >
                                                        {displayName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t("common.active")}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {kid.reservationCode} ·{" "}
                                                    {t("kidsAreaCalloutsTranslations.ends")}{" "}
                                                    {formatTime(kid.endTime)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            {t("kidsAreaCalloutsTranslations.calloutPhrases")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="text-xs text-muted-foreground">
                            {t("kidsAreaCalloutsTranslations.tipPrefix")}{" "}
                            <span className="font-mono">{`{name}`}</span>{" "}
                            {t("kidsAreaCalloutsTranslations.tipSuffix")}
                        </div>
                        <Separator />

                        <ScrollArea className="h-[360px] pr-3">
                            <div className="flex flex-col gap-2">
                                {phraseList.length === 0 ? (
                                    <div className="py-6 text-sm text-muted-foreground">
                                        {t("kidsAreaCalloutsTranslations.noPhrases")}
                                    </div>
                                ) : (
                                    phraseList.map((phrase, idx) => {
                                        const preview = renderTemplate(
                                            phrase.template,
                                            selectedKid?.kidName,
                                        );
                                        return (
                                            <div
                                                key={phrase.id ?? `draft_${idx}`}
                                                className="rounded-md border p-3"
                                            >
                                                {editMode ? (
                                                    <div className="flex flex-col gap-2">
                                                        <Textarea
                                                            value={phrase.template}
                                                            onChange={(e) => {
                                                                const next = e.target.value;
                                                                setDraftPhrases((prev) =>
                                                                    prev.map((p, i) =>
                                                                        i === idx ? { ...p, template: next } : p,
                                                                    ),
                                                                );
                                                            }}
                                                            className="min-h-[72px]"
                                                            placeholder={`Example: ${NAME_TOKEN}${t(
                                                                "kidsAreaCalloutsTranslations.phrasePlaceholderTail",
                                                            )}`}
                                                        />
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-xs text-muted-foreground">
                                                                {t("kidsAreaCalloutsTranslations.preview")}:{" "}
                                                                {preview ||
                                                                    t("kidsAreaCalloutsTranslations.empty")}
                                                            </div>
                                                            <Button
                                                                variant="destructive"
                                                                className="h-8 px-2"
                                                                onClick={() => deleteDraftPhrase(idx)}
                                                                disabled={draftPhrases.length <= 1}
                                                            >
                                                                {t("common.delete")}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => callPhrase(phrase.template)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                callPhrase(phrase.template);
                                                            }
                                                        }}
                                                        className="flex w-full cursor-pointer flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <div className="text-sm font-medium leading-relaxed">
                                                            {phrase.template ||
                                                                t("kidsAreaCalloutsTranslations.emptyPhrase")}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {t("kidsAreaCalloutsTranslations.preview")}:{" "}
                                                            {preview ||
                                                                t("kidsAreaCalloutsTranslations.empty")}
                                                        </div>
                                                        <div className="pt-1">
                                                            <div className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                                                                {t("kidsAreaCalloutsTranslations.call")}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>

                        {editMode ? (
                            <div className="flex items-center justify-between gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={addDraftPhrase}
                                    disabled={isSaving}
                                >
                                    {t("kidsAreaCalloutsTranslations.addPhrase")}
                                </Button>
                                <div className="text-xs text-muted-foreground">
                                    {t("kidsAreaCalloutsTranslations.saveToApplyChanges")}
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
