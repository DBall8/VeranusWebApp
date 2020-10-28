export class Reading
{
    temperatureF: number;
    humidity: number;
    light: number;
    timestamp: number;

    constructor(temperatureF: number, humidity: number, light: number, timestamp: number)
    {
        this.temperatureF = temperatureF;
        this.humidity = humidity;
        this.light = light;
        this.timestamp = timestamp;
    }
};