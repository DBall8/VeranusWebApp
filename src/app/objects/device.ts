import { Reading } from './reading'
import { ValueRange } from './valueRange'



export class Device
{
    public id: string;
    public name: string;
    public lastReading: Reading;
    public temperatureRange: ValueRange;
    public humidityRange: ValueRange;
    public lightRange: ValueRange;

    constructor(id: string,
                name?: string,
                reading?: Reading,
                temperatureRange?: ValueRange,
                humidityRange?: ValueRange,
                lightRange?: ValueRange)
    {
        this.id = id;
        this.name = name ? name : "";
        this.lastReading = reading ? reading : new Reading(0, 0, 0, 0);
        this.temperatureRange = temperatureRange ? temperatureRange : new ValueRange(Reading.MIN_TEMPERATURE, Reading.MAX_TEMPERATURE, Reading.MIN_TEMPERATURE, Reading.MAX_TEMPERATURE);
        this.humidityRange = humidityRange ? humidityRange : new ValueRange(Reading.MIN_PERCENT, Reading.MAX_PERCENT, Reading.MIN_PERCENT, Reading.MAX_PERCENT);
        this.lightRange = lightRange ? lightRange : new ValueRange(Reading.MIN_PERCENT, Reading.MAX_PERCENT, Reading.MIN_PERCENT, Reading.MAX_PERCENT);
    }
};