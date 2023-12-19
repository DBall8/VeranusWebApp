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

    public isEqual(other: ValueRange): boolean
    {
        return (this.dangerLow == other.dangerLow) &&
                (this.warningLow == other.warningLow) &&
                (this.warningHigh == other.warningHigh) &&
                (this.dangerHigh == other.dangerHigh);
    }

    public copy(other: ValueRange)
    {
        this.dangerLow = other.dangerLow;
        this.warningLow = other.warningLow;
        this.warningHigh = other.warningHigh;
        this.dangerHigh = other.dangerHigh;
    }
}