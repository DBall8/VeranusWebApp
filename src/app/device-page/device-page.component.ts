import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'

import { DeviceService } from '../services/device.service'
import { Device } from '../objects/device';

@Component({
  selector: 'app-device-page',
  templateUrl: './device-page.component.html',
  styleUrls: ['./device-page.component.css']
})
export class DevicePageComponent implements OnInit {

  device?: Device = null;
  numReadings: number = 100000;

  readings: any[] = [];

  showTempGraph: boolean = false;
  showHumidityGraph: boolean = false;
  showLightGraph: boolean = false;

  update: boolean;

  constructor(private deviceService: DeviceService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit()
  {
    this.route.paramMap.subscribe((params) =>
    {
      var deviceId = params.get('deviceId');
      this.device = this.deviceService.getDevice(deviceId);

      if (this.device)
      {
        // Found device, load its saved data
        this.loadReadings();
        this.deviceService.loadRanges(deviceId);
      }
      else
      {
        // Device not found, attempt to load device list
        this.deviceService.loadDevices()
          .then((success) =>
          {
            // Successful, try one more time to get the device
            this.device = this.deviceService.getDevice(deviceId);

            if (!this.device)
            {
              // Still failed, redirect
              this.router.navigate(['/']);
              return;
            }

            this.loadReadings();
            this.deviceService.loadRanges(deviceId);
          })
          .catch(() =>
          {
            // Failed, redirect to the main page
            this.router.navigate(['/']);
          })
      }
    })
  }

  loadReadings()
  {
    this.deviceService.getReadings(this.device.id, this.numReadings).subscribe((response) =>
      {
        // Redirect if session expired
        if (response && response.sessionExpired)
        {
          this.router.navigate(['/login']);
          return true;
        }

        if (!response || !response.body || !response.body.success)
        {
          // Failure to retrieve device
          return;
        }

        // Save the device's last reading, if there is one
        if (response.body.readings && (response.body.readings.length > 0))
        {
            this.readings = response.body.readings;
        }
      }
    );
  }
}
