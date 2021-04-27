import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'

import { DeviceService } from '../services/device.service'
import { Device } from '../objects/device';

@Component({
  selector: 'app-device-settings-page',
  templateUrl: './device-settings-page.component.html',
  styleUrls: ['./device-settings-page.component.css']
})
export class DeviceSettingsPageComponent implements OnInit {

    device: Device;

    constructor(private deviceService: DeviceService, private route: ActivatedRoute, private router: Router) { }

    ngOnInit() {
        this.route.paramMap.subscribe((params) =>
        {
            var deviceId = params.get('deviceId');
            this.device = this.deviceService.getDevice(deviceId);

            
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
