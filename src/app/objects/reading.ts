export class Reading
{
    public temperatureF: number;
    public humidity: number;
    public light: number;
    public timestamp: number;

    constructor(temperatureF: number, humidity: number, light: number, timestamp: number)
    {
        this.temperatureF = temperatureF;
        this.humidity = humidity;
        this.light = light;
        this.timestamp = timestamp;
    }

    public static readonly MAX_TEMPERATURE: number = 120;
    public static readonly MIN_TEMPERATURE: number = -40;
    public static readonly MAX_PERCENT: number = 100;
    public static readonly MIN_PERCENT: number = 0;
};