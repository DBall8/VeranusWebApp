import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'

import { DeviceService } from '../services/device.service'
import { Device } from '../objects/device';
import { Reading } from '../objects/reading';

@Component({
  selector: 'app-device-settings-page',
  templateUrl: './device-settings-page.component.html',
  styleUrls: ['./device-settings-page.component.css']
})
export class DeviceSettingsPageComponent implements OnInit {

    @ViewChild('UploadFile', {static: false}) uploadFile: ElementRef;
    @ViewChild('ThresholdsContainer', {static: false}) thresholdsContainer: ElementRef;

    device: Device;

    minTemperature: number = Reading.MIN_TEMPERATURE;
    maxTemperature: number = Reading.MAX_TEMPERATURE;
    minPercent: number = Reading.MIN_PERCENT;
    maxPercent: number = Reading.MAX_PERCENT;

    constructor(private deviceService: DeviceService, private route: ActivatedRoute, private router: Router) { }

    ngOnInit() {
        this.route.paramMap.subscribe((params) =>
        {
            var deviceId = params.get('deviceId');
            this.device = this.deviceService.getDevice(deviceId);

            if (this.device)
            {
                // Found device, load its saved data
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

    async uploadImage()
    {
        var fileObj = this.uploadFile.nativeElement.files[0];
        if (fileObj != undefined)
        {
            var fileBuffer: ArrayBuffer = await fileObj.arrayBuffer();
            this.deviceService.saveImage(this.device.id, fileBuffer, fileObj.type).subscribe((response: any) =>
            {
                if (!response || !response.body || !response.body.success)
                {
                    alert("Failed to upload image, please try again later.")
                }
                else
                {
                    location.reload();
                }
            });
        }
        else
        {
            alert("Please click Browse to select an image first")
        }
    }

    removeImage()
    {
        this.deviceService.deleteImage(this.device.id).subscribe((response: any) =>
        {
            if (!response || !response.body || !response.body.success)
            {
                alert("Failed to remove image, please try again later.")
            }
            else
            {
                location.reload();
            }
        })
    }

    saveRanges()
  {
    this.deviceService.saveRanges(this.device.id).subscribe((response: any) =>
    {
      if (!response.body)
      {
        alert("Server error: please try again later");
        return;
      }

      if (!response.body.success)
      {
        var errorText: string = "Failed to update device settings";
        if (response.body.reason)
        {
          errorText += ": " + response.body.reason;
        }

        alert(errorText);
        return;
      }

      alert("Settings saved!")
    })
  }

  deleteDevice()
  {
    if (window.confirm("Are you sure you want to delete this device?"))
    {
        this.deviceService.deleteDevice(this.device.id).subscribe((response: any) =>
        {
        if (!response.body)
        {
            alert("Server error: please try again later");
            return;
        }

        if (!response.body.success)
        {
            var errorText: string = "Failed to delete device";
            if (response.body.reason)
            {
            errorText += ": " + response.body.reason;
            }

            alert(errorText);
            return;
        }

        this.router.navigate(['/']);
        })
    }
  }

}
