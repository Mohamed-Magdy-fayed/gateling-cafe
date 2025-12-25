export type ActiveKidInArea = {
    reservationId: string;
    kidName: string | null;
    reservationCode: string;
    startTime: string;
    endTime: string;
};

export type KidsAreaCalloutPhraseDTO = {
    id: string;
    template: string;
    sortOrder: number;
};
