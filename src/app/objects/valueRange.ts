export class ValueRange
{
    public dangerLow: number;
    public dangerHigh: number;
    public warningLow: number;
    public warningHigh: number;

    constructor(dangerLow: number,
                dangerHigh: number,
                warningLow: number,
                warningHigh: number)
    {
        this.dangerLow = dangerLow;
        this.dangerHigh = dangerHigh;
        this.warningLow = warningLow;
        this.warningHigh = warningHigh;
    }
}