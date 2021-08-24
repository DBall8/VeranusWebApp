import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import * as io from 'socket.io-client';

import { Device } from '../objects/device'
import { Reading } from '../objects/reading'
import { ValueRange } from '../objects/valueRange'

const debug = false;
const socketUrl = debug ? "http://localhost:8002" : "https://veranus.site";
const socketSecure: boolean = !debug;

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  public devices: Device[];

  private socketConn;

  constructor(private http: HttpClient, private router: Router)
  {
    if (debug)
    {
      this.devices =
        [
          new Device("1", "First", new Reading(102.5673, 34.34526, 98.3457345, new Date().getTime())),
          new Device("2", "Second", new Reading(67.822222, 48.00001, 1, new Date().getTime())),
          new Device("3", "Third", new Reading(88.888, 55.555555, 3.3333333333, new Date().getTime()))
        ];
    }
  }

  findDeviceIndex(deviceId: string): number
  {
    for (var i=0; i<this.devices.length; i++)
    {
      if (this.devices[i].id === deviceId)
      {
        return i;
      }
    }

    return -1;
  }

  addDevice(deviceName: string, deviceId: string): Observable<any>
  {
    return this.http.request(
      "PUT",
      "/device",
      {
        observe: 'response',
        body:
        {
          deviceName: deviceName,
          deviceId: deviceId
        }
      }
    );
  }

  private getDevices(): Observable<any>
  {
    return this.http.request(
      "GET",
      "/device",
      {
        observe: 'response',
      }
    );
  }

  loadDevice(id: string, name: string)
  {
    this.devices.push(new Device(id, name));
    this.loadLastReading(id);
    this.loadRanges(id);

    // Tell the socket connection that these devices belong to this socket
    if (this.socketConn)
    {
      this.socketConn.emit('device', id);
    }
  }

  loadDevices(): Promise<boolean>
  {
    return new Promise((resolve, reject) =>
    {
      this.startSocket();

      this.getDevices().subscribe((res) =>
      {
        this.devices = [];

        // Redirect to login if sessionExpired
        if (this.isSessionExpired(res.body))
        {
          reject();
          return;
        }

        if (!res.body || !res.body.success || !res.body.devices)
        {
          // Retrieval failed
          reject();
          return;
        }

        var receivedDevices = res.body.devices;

        // Load the devices into the live list
        for (var i=0; i<receivedDevices.length; i++)
        {
          var device = receivedDevices[i];
          this.loadDevice(device.id, device.name);
        }

        resolve(true);
      });
    });
  }

  getDevice(id: string): Device
  {
    if (!this.devices) return null;

    for (var i = 0; i<this.devices.length; i++)
    {
      if (this.devices[i].id === id)
      {
        return this.devices[i];
      }
    }

    // Failed to find device
    return null;
  }

  deleteDevice(id: string): Observable<any>
  {
    return this.http.request(
      "DELETE",
      "/device",
      {
        observe: "response",
        body:
        {
          deviceId: id
        }
      }
    );
  }

  getReadings(id: string, numReadings: number): Observable<any>
  {
    var queryString: string = `/readings?id=${id}&count=${numReadings}`;
    return this.http.request(
      "GET",
      queryString,
      {
        observe: "response"
      }
    );
  }

  loadLastReading(id: string)
  {
    var deviceIndex = this.findDeviceIndex(id);

    if (deviceIndex < 0)
    {
      // device with this ID was not found
      return;
    }

    var device = this.devices[deviceIndex];

    this.getReadings(device.id, 1).subscribe((res: any) =>
    {
      // Redirect if session expired
      if (this.isSessionExpired(res.body)) return;

      if (!res || !res.body || !res.body.success)
      {
        // Failure to retrieve device
        return;
      }

      // Save the device's last reading, if there is one
      if (res.body.readings && (res.body.readings.length > 0))
      {
        var lastReading = res.body.readings[0];
        device.lastReading = new Reading(
          lastReading.temperature,
          lastReading.humidity,
          lastReading.light,
          lastReading.timestamp);
      }
    })
  }

  getRanges(deviceId: string): Observable<any>
  {
    var queryString: string = `/ranges?id=${deviceId}`;
    return this.http.request(
      "GET",
      queryString,
      {
        observe: "response"
      }
    );
  }

  loadRanges(deviceId: string)
  {
    this.getRanges(deviceId).subscribe((res: any) =>
    {
      // Redirect if session expired
      if (this.isSessionExpired(res.body)) return;

      if (!res || !res.body || !res.body.success)
      {
        // Failure to retrieve device
        return;
      }

      var tempRange = new ValueRange(
        res.body.temperatureRange.dangerLow,
        res.body.temperatureRange.dangerHigh,
        res.body.temperatureRange.warningLow,
        res.body.temperatureRange.warningHigh);

      var humidityRange = new ValueRange(
        res.body.humidityRange.dangerLow,
        res.body.humidityRange.dangerHigh,
        res.body.humidityRange.warningLow,
        res.body.humidityRange.warningHigh);

      var lightRange = new ValueRange(
        res.body.lightRange.dangerLow,
        res.body.lightRange.dangerHigh,
        res.body.lightRange.warningLow,
        res.body.lightRange.warningHigh);

      var deviceIndex = this.findDeviceIndex(deviceId);
      if (deviceIndex < 0) return;

      this.devices[deviceIndex].temperatureRange = tempRange;
      this.devices[deviceIndex].humidityRange = humidityRange;
      this.devices[deviceIndex].lightRange = lightRange;
    })
  }

  saveRanges(deviceId: string): Observable<any>
  {
    var deviceIndex = this.findDeviceIndex(deviceId);
    if (deviceIndex < 0)
    {
      console.log("Device not found")
      return null;
    }

    var device = this.devices[deviceIndex];

    return this.http.request(
      "POST",
      "/ranges",
      {
        observe: 'response',
        body:
        {
          deviceId: device.id,
          temperatureRange:
            {
              dangerLow: device.temperatureRange.dangerLow,
              dangerHigh: device.temperatureRange.dangerHigh,
              warningLow: device.temperatureRange.warningLow,
              warningHigh: device.temperatureRange.warningHigh,
            },
          humidityRange:
            {
              dangerLow: device.humidityRange.dangerLow,
              dangerHigh: device.humidityRange.dangerHigh,
              warningLow: device.humidityRange.warningLow,
              warningHigh: device.humidityRange.warningHigh,
            },
          lightRange:
            {
              dangerLow: device.lightRange.dangerLow,
              dangerHigh: device.lightRange.dangerHigh,
              warningLow: device.lightRange.warningLow,
              warningHigh: device.lightRange.warningHigh,
            }
        }
      }
    )
  }

    readFile(file: File): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            var reader: FileReader = new FileReader();

            reader.addEventListener('load', (event) =>
            {
                resolve(event['target']['result']);
            })

            reader.readAsText(file);
        });
    }

    saveImage(deviceId: string, imageFile: ArrayBuffer, type: string): Observable<any>
    {
        var data1: Uint8Array = new Uint8Array(imageFile);

        var data2 = [];
        for (var i=0; i<data1.byteLength; i++)
        {
            data2.push(data1[i]);
        }
        

        return this.http.request(
            "POST",
            "/image",
            {
                observe: "response",
                body:
                {
                    deviceId: deviceId,
                    file: data2,
                    type: type
                }
            }
        );
    }

    deleteImage(deviceId: string): Observable<any>
    {
        return this.http.request(
            "DELETE",
            "/image",
            {
                observe: "response",
                body:
                {
                    deviceId: deviceId,
                }
            }
        );
    }

  startSocket()
  {
    if (this.socketConn)
    {
      this.socketConn.disconnect();
    }
    this.socketConn = io(socketUrl, {secure: socketSecure});

    this.socketConn.on("reading", (update) =>
    {
      if (!update || !update.id || !update.reading)
      {
        // Error in socket packet
        return;
      }
      
      // Find the device with matching ID, and update its last reading
      for (var i=0; i<this.devices.length; i++)
      {
        if (this.devices[i].id === update.id)
        {
          this.devices[i].lastReading = new Reading(
            update.reading.temperature,
            update.reading.humidity,
            update.reading.light,
            update.reading.timestamp
          )
          return;
        }
      }
    })

    this.socketConn.on("connect", () =>
    {
        if (this.devices)
        {
            for (var i=0; i<this.devices.length; i++)
            {
                this.socketConn.emit("device", this.devices[i].id);
            }
        }
    });
  }

  isSessionExpired(response: any): boolean
  {
    if (response && response.sessionExpired)
    {
      this.router.navigate(['/login']);
      return true;
    }

    return false;
  }
}
